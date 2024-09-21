/**
 * Conversation thread — `/messages/[id]`.
 *
 * Stack screen au-dessus des tabs (back natif). Affiche :
 *   - header : nom du peer, pet associé éventuel
 *   - liste inversée des messages, alignés droite/gauche selon `asSide`
 *   - réactions emoji sous chaque bulle (chips ; highlight si mienne)
 *   - input bar bas avec envoi (POST /conversations/{id}/messages)
 *
 * Interactions :
 *   - Long-press sur bulle → bottom sheet : Réagir, Modifier (si mienne <5min),
 *     Copier le texte
 *   - Mode édition : la input bar bascule en bandeau "Modifier" + bouton OK
 *     (PATCH /conversations/{id}/messages/{messageId})
 *   - Tap sur emoji chip → toggle ta propre réaction sur ce message
 *
 * Refetch : context (1×), messages (polling 5s), PATCH /read au mount +
 * à chaque nouveau message reçu.
 */

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Clipboard,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GifPicker, type SelectedGif } from "@/components/gif-picker";
import { VoicePlayer } from "@/components/voice-player";
import { uploadVoice } from "@/lib/uploads";
import { startRecording, type RecorderHandle } from "@/lib/voice";
import type { components } from "@dorloter/api-client";

type Message = components["schemas"]["Message"];
type MessageAttachment = components["schemas"]["MessageAttachment"];

const SCREEN_W = Dimensions.get("window").width;
const GIF_MAX_WIDTH = SCREEN_W * 0.6;

const POLL_INTERVAL_MS = 5_000;
const MAX_LEN = 2000;
const EDIT_WINDOW_MS = 5 * 60 * 1000;

// Whitelist serveur (cf. apps/web/src/domains/messaging/emojis.ts).
const ALLOWED_EMOJIS = [
  "🙏",
  "❤️",
  "👍",
  "👎",
  "😂",
  "😢",
  "🎉",
  "🐾",
  "🔥",
  "✅",
] as const;

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const [draft, setDraft] = useState("");
  const [menuMessage, setMenuMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  // Typing notify : on POST `isTyping=true` au plus toutes les 2.5s, et
  // `false` 3s après le dernier keystroke. Le serveur a un TTL 5s donc
  // l'indicateur disparaît tout seul si le client crashe.
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastTypingNotifyRef = useRef(0);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });
  const myUserId = meQuery.data?.id ?? null;

  const contextQuery = useQuery({
    enabled: !!id,
    queryKey: ["messaging", "conversation", id, "context"],
    queryFn: async () => {
      const { data, error } = await api.GET("/conversations/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  const messagesQuery = useQuery({
    enabled: !!id,
    queryKey: ["messaging", "conversation", id, "messages"],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/conversations/{id}/messages",
        { params: { path: { id: id! } } }
      );
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    refetchInterval: POLL_INTERVAL_MS,
  });

  // Polling typing : 2s pour rester réactif sans saturer.
  const typingQuery = useQuery({
    enabled: !!id,
    queryKey: ["messaging", "conversation", id, "typing"],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/conversations/{id}/typing",
        { params: { path: { id: id! } } }
      );
      if (error) return { userIds: [] as string[] };
      return data.data;
    },
    refetchInterval: 2_000,
  });
  const peerTyping = (typingQuery.data?.userIds.length ?? 0) > 0;

  const notifyTypingMut = useMutation({
    mutationFn: async (isTyping: boolean) => {
      if (!id) return;
      await api.POST("/conversations/{id}/typing", {
        params: { path: { id } },
        body: { isTyping },
      });
    },
  });

  function handleDraftChange(value: string) {
    setDraft(value);
    const hasContent = value.trim().length > 0;
    if (hasContent) {
      const now = Date.now();
      if (now - lastTypingNotifyRef.current > 2500) {
        lastTypingNotifyRef.current = now;
        notifyTypingMut.mutate(true);
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      typingStopTimeoutRef.current = setTimeout(() => {
        lastTypingNotifyRef.current = 0;
        notifyTypingMut.mutate(false);
      }, 3000);
    }
  }

  // Stop typing au démontage du screen (back, kill, etc.).
  useEffect(() => {
    return () => {
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      if (id && lastTypingNotifyRef.current > 0) {
        void api
          .POST("/conversations/{id}/typing", {
            params: { path: { id } },
            body: { isTyping: false },
          })
          .catch(() => {});
      }
    };
  }, [id]);

  const markReadMut = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await api.PATCH("/conversations/{id}/read", {
        params: { path: { id } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messaging", "unread-count"],
      });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "inbox", "user"],
      });
    },
  });

  useEffect(() => {
    if (!id || !messagesQuery.data) return;
    const last = messagesQuery.data[messagesQuery.data.length - 1];
    if (!last) return;
    if (last.id === lastSeenIdRef.current) return;
    const asSide = contextQuery.data?.asSide;
    if (asSide && last.senderType !== asSide) {
      markReadMut.mutate();
    }
    lastSeenIdRef.current = last.id;
  }, [messagesQuery.data, contextQuery.data, id, markReadMut]);

  const sendMut = useMutation({
    mutationFn: async (payload: {
      content?: string;
      attachment?: MessageAttachment;
    }) => {
      if (!id) throw new Error("Conversation introuvable.");
      const { data, error } = await api.POST(
        "/conversations/{id}/messages",
        { params: { path: { id } }, body: payload }
      );
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    onSuccess: () => {
      setDraft("");
      messagesQuery.refetch();
      queryClient.invalidateQueries({
        queryKey: ["messaging", "inbox", "user"],
      });
    },
    onError: (err) => {
      Alert.alert("Envoi impossible", err.message);
    },
  });

  const reactMut = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      if (!id) throw new Error("Conversation introuvable.");
      const { data, error } = await api.POST(
        "/conversations/{id}/messages/{messageId}/reactions",
        {
          params: { path: { id, messageId } },
          body: { emoji },
        }
      );
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    onSuccess: () => {
      messagesQuery.refetch();
    },
    onError: (err) => {
      Alert.alert("Réaction impossible", err.message);
    },
  });

  const editMut = useMutation({
    mutationFn: async ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => {
      if (!id) throw new Error("Conversation introuvable.");
      const { data, error } = await api.PATCH(
        "/conversations/{id}/messages/{messageId}",
        {
          params: { path: { id, messageId } },
          body: { content },
        }
      );
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    onSuccess: () => {
      setEditingMessage(null);
      setEditDraft("");
      messagesQuery.refetch();
    },
    onError: (err) => {
      Alert.alert("Modification impossible", err.message);
    },
  });

  function handleSend() {
    const content = draft.trim();
    if (!content || sendMut.isPending) return;
    sendMut.mutate({ content });
  }

  function handleGifSelected(gif: SelectedGif) {
    setGifPickerOpen(false);
    sendMut.mutate({
      attachment: {
        type: "gif",
        url: gif.url,
        meta: {
          type: "gif",
          provider: "tenor",
          externalId: gif.externalId,
          width: gif.width,
          height: gif.height,
          previewUrl: gif.previewUrl,
        },
      },
    });
  }

  async function handleStartRecord() {
    try {
      const handle = await startRecording();
      recorderRef.current = handle;
      setRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(handle.getDurationMs());
      }, 200);
    } catch (err) {
      Alert.alert(
        "Enregistrement impossible",
        err instanceof Error ? err.message : "Erreur micro."
      );
    }
  }

  async function handleCancelRecord() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    await recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecording(false);
    setRecordingDuration(0);
  }

  async function handleStopRecord() {
    if (!recorderRef.current) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const result = await recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
    setRecordingDuration(0);
    if (!result || result.durationMs < 500) {
      Alert.alert(
        "Trop court",
        "Maintiens le bouton un peu plus longtemps pour enregistrer un message."
      );
      return;
    }
    setUploadingVoice(true);
    try {
      const upload = await uploadVoice({
        fileUri: result.uri,
        contentType: "audio/mp4",
      });
      sendMut.mutate({
        attachment: {
          type: "voice",
          url: upload.url,
          meta: {
            type: "voice",
            durationMs: result.durationMs,
            mimeType: result.mimeType,
          },
        },
      });
    } catch (err) {
      Alert.alert(
        "Envoi impossible",
        err instanceof Error ? err.message : "Erreur réseau."
      );
    } finally {
      setUploadingVoice(false);
    }
  }

  function handleEditSubmit() {
    if (!editingMessage) return;
    const content = editDraft.trim();
    if (!content || editMut.isPending) return;
    editMut.mutate({ messageId: editingMessage.id, content });
  }

  function openMenu(message: Message) {
    setMenuMessage(message);
  }
  function closeMenu() {
    setMenuMessage(null);
  }

  function handleReact(emoji: string) {
    if (!menuMessage) return;
    reactMut.mutate({ messageId: menuMessage.id, emoji });
    closeMenu();
  }

  function handleStartEdit() {
    if (!menuMessage) return;
    setEditingMessage(menuMessage);
    setEditDraft(menuMessage.content ?? "");
    closeMenu();
  }

  function handleCopy() {
    if (!menuMessage) return;
    Clipboard.setString(menuMessage.content ?? "");
    closeMenu();
  }

  function handleQuickReact(message: Message, emoji: string) {
    reactMut.mutate({ messageId: message.id, emoji });
  }

  if (contextQuery.isPending || messagesQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "" }} />
        <Text style={styles.errorTitle}>Conversation introuvable</Text>
        <Text style={styles.errorBody}>
          {contextQuery.error?.message ?? "Vérifie le lien."}
        </Text>
      </View>
    );
  }

  const ctx = contextQuery.data;
  const messages = messagesQuery.data ?? [];
  const reversed = [...messages].reverse();

  const menuCanEdit = canEditMessage(menuMessage, myUserId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Messages",
          headerTitle: () => (
            <ConversationHeader
              peerName={ctx.peerName}
              peerImageUrl={ctx.peerImageUrl}
              petName={ctx.petName}
              onPress={
                ctx.peerSlug
                  ? () => router.push(`/shelter/${ctx.peerSlug}`)
                  : undefined
              }
            />
          ),
        }}
      />

      <FlatList
        data={reversed}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            mine={item.senderType === ctx.asSide}
            myUserId={myUserId}
            onLongPress={() => openMenu(item)}
            onReactionTap={(emoji) => handleQuickReact(item, emoji)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyBody}>
              Aucun message pour l'instant — écris le premier ci-dessous.
            </Text>
          </View>
        }
      />

      {peerTyping ? (
        <View style={styles.typingBanner}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDotA]} />
            <View style={[styles.typingDot, styles.typingDotB]} />
            <View style={[styles.typingDot, styles.typingDotC]} />
          </View>
          <Text style={styles.typingBannerText}>
            {ctx.peerName} est en train d&apos;écrire…
          </Text>
        </View>
      ) : null}

      {editingMessage ? (
        <EditBar
          draft={editDraft}
          onChange={setEditDraft}
          onCancel={() => {
            setEditingMessage(null);
            setEditDraft("");
          }}
          onSubmit={handleEditSubmit}
          submitting={editMut.isPending}
        />
      ) : recording ? (
        <View style={[styles.recordBar, { paddingBottom: bottomInset }]}>
          <View style={styles.recordPulse} />
          <Text style={styles.recordTimer}>
            {formatRecordTimer(recordingDuration)}
          </Text>
          <Text style={styles.recordHint}>Enregistrement…</Text>
          <Pressable
            style={styles.recordCancelBtn}
            onPress={handleCancelRecord}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="close" size={20} color="#7a5f5f" />
          </Pressable>
          <Pressable
            style={styles.recordStopBtn}
            onPress={handleStopRecord}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="send" size={20} color="white" />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: bottomInset }]}>
          <Pressable
            style={styles.attachBtn}
            onPress={() => setGifPickerOpen(true)}
            disabled={sendMut.isPending}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="file-gif-box"
              size={26}
              color="#e8634d"
            />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Écris un message…"
            value={draft}
            onChangeText={handleDraftChange}
            multiline
            maxLength={MAX_LEN}
            editable={!sendMut.isPending && !uploadingVoice}
          />
          {draft.trim() ? (
            <Pressable
              style={[
                styles.sendBtn,
                sendMut.isPending && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={sendMut.isPending}
            >
              {sendMut.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <MaterialCommunityIcons name="send" size={20} color="white" />
              )}
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.sendBtn,
                uploadingVoice && styles.sendBtnDisabled,
              ]}
              onPress={handleStartRecord}
              disabled={sendMut.isPending || uploadingVoice}
            >
              {uploadingVoice ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <MaterialCommunityIcons
                  name="microphone"
                  size={20}
                  color="white"
                />
              )}
            </Pressable>
          )}
        </View>
      )}

      <GifPicker
        visible={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={handleGifSelected}
      />

      {/* ─── Bottom-sheet menu sur long-press ──────────────────────── */}
      <Modal
        visible={menuMessage !== null}
        animationType="fade"
        transparent
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <Pressable style={styles.menuSheet} onPress={() => {}}>
            <View style={styles.emojiRow}>
              {ALLOWED_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.emojiBtn}
                  onPress={() => handleReact(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.menuDivider} />
            {menuCanEdit ? (
              <MenuRow
                icon="pencil"
                label="Modifier le message"
                onPress={handleStartEdit}
              />
            ) : null}
            <MenuRow icon="content-copy" label="Copier le texte" onPress={handleCopy} />
            <MenuRow
              icon="close"
              label="Annuler"
              onPress={closeMenu}
              muted
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Helpers / sous-composants ──────────────────────────────────────────────

function canEditMessage(
  message: Message | null,
  myUserId: string | null
): boolean {
  if (!message || !myUserId) return false;
  if (message.senderId !== myUserId) return false;
  const age = Date.now() - new Date(message.createdAt).getTime();
  return age < EDIT_WINDOW_MS;
}

function MessageBubble({
  message,
  mine,
  myUserId,
  onLongPress,
  onReactionTap,
}: {
  message: Message;
  mine: boolean;
  myUserId: string | null;
  onLongPress: () => void;
  onReactionTap: (emoji: string) => void;
}) {
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={{ maxWidth: "78%" }}>
        <Pressable
          delayLongPress={250}
          onLongPress={onLongPress}
          style={[
            message.attachment?.type === "gif"
              ? styles.bubbleGif
              : styles.bubble,
            !message.attachment && (mine ? styles.bubbleMine : styles.bubbleTheirs),
          ]}
        >
          {message.attachment?.type === "gif" ? (
            <GifAttachment attachment={message.attachment} />
          ) : null}
          {message.attachment?.type === "voice" &&
          message.attachment.meta.type === "voice" ? (
            <VoicePlayer
              url={message.attachment.url}
              durationMs={message.attachment.meta.durationMs}
              mine={mine}
            />
          ) : null}
          {message.content ? (
            <Text
              style={[
                styles.bubbleText,
                message.attachment ? styles.bubbleTextWithGif : null,
                mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                message.attachment ? styles.bubbleTextDark : null,
              ]}
            >
              {message.content}
            </Text>
          ) : null}
          <View
            style={[
              styles.bubbleMetaRow,
              message.attachment ? styles.bubbleMetaOverlay : null,
            ]}
          >
            {message.editedAt ? (
              <Text
                style={[
                  styles.editedLabel,
                  mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
                  message.attachment ? styles.bubbleTimeOverlay : null,
                ]}
              >
                modifié ·{" "}
              </Text>
            ) : null}
            <Text
              style={[
                styles.bubbleTime,
                mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
                message.attachment ? styles.bubbleTimeOverlay : null,
              ]}
            >
              {formatBubbleTime(message.createdAt)}
            </Text>
          </View>
        </Pressable>
        {message.reactions.length > 0 ? (
          <View
            style={[
              styles.reactionsRow,
              mine ? styles.reactionsRowMine : styles.reactionsRowTheirs,
            ]}
          >
            {message.reactions.map((r) => {
              const isMine = myUserId !== null && r.userIds.includes(myUserId);
              return (
                <Pressable
                  key={r.emoji}
                  onPress={() => onReactionTap(r.emoji)}
                  style={[
                    styles.reactionChip,
                    isMine && styles.reactionChipMine,
                  ]}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text
                    style={[
                      styles.reactionCount,
                      isMine && styles.reactionCountMine,
                    ]}
                  >
                    {r.count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ConversationHeader({
  peerName,
  peerImageUrl,
  petName,
  onPress,
}: {
  peerName: string;
  peerImageUrl: string | null;
  petName: string | null;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.headerContent}>
      <View style={styles.headerAvatar}>
        {peerImageUrl ? (
          <Image
            source={{ uri: peerImageUrl }}
            contentFit="cover"
            style={styles.headerAvatarImg}
          />
        ) : (
          <MaterialCommunityIcons name="home-heart" size={18} color="#a08585" />
        )}
      </View>
      <View style={styles.headerTextCol}>
        <Text style={styles.headerName} numberOfLines={1}>
          {peerName}
        </Text>
        {petName ? (
          <Text style={styles.headerPetSub} numberOfLines={1}>
            Au sujet de {petName}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color="#a08585"
        />
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {body}
    </Pressable>
  );
}

function GifAttachment({ attachment }: { attachment: MessageAttachment }) {
  if (attachment.meta.type !== "gif") return null;
  const ratio = attachment.meta.width / attachment.meta.height;
  const width = GIF_MAX_WIDTH;
  const height = width / (ratio || 1);
  return (
    <Image
      source={{ uri: attachment.url }}
      contentFit="cover"
      transition={150}
      style={{ width, height, borderRadius: 14 }}
    />
  );
}

function formatRecordTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MenuRow({
  icon,
  label,
  onPress,
  muted,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={muted ? "#a08585" : "#1f1414"}
      />
      <Text style={[styles.menuRowLabel, muted && styles.menuRowLabelMuted]}>
        {label}
      </Text>
    </Pressable>
  );
}

function EditBar({
  draft,
  onChange,
  onCancel,
  onSubmit,
  submitting,
}: {
  draft: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <View style={styles.editBarWrap}>
      <View style={styles.editHeader}>
        <MaterialCommunityIcons name="pencil" size={14} color="#7065a8" />
        <Text style={styles.editHeaderLabel}>Modifier le message</Text>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={styles.editCancel}>Annuler</Text>
        </Pressable>
      </View>
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={onChange}
          multiline
          maxLength={MAX_LEN}
          editable={!submitting}
          autoFocus
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!draft.trim() || submitting) && styles.sendBtnDisabled,
          ]}
          onPress={onSubmit}
          disabled={!draft.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <MaterialCommunityIcons name="check" size={20} color="white" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function formatBubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  typingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#f3eff8",
    borderTopWidth: 1,
    borderColor: "#e7e2f3",
  },
  typingBannerText: { fontSize: 12, color: "#7065a8", fontStyle: "italic" },

  headerContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f5ece4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImg: { width: 34, height: 34 },
  headerTextCol: { gap: 1 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#1f1414" },
  headerPetSub: { fontSize: 11, color: "#7a5f5f" },
  headerTypingSub: { fontSize: 11, color: "#4a9d7a", fontStyle: "italic" },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  typingDots: { flexDirection: "row", gap: 2 },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4a9d7a",
  },
  // Variations subtiles d'opacité pour suggérer l'animation (RN simple,
  // sans Animated). Pour une vraie anim, passer en reanimated.
  typingDotA: { opacity: 0.4 },
  typingDotB: { opacity: 0.7 },
  typingDotC: { opacity: 1 },

  list: { padding: 12, gap: 6 },
  empty: { padding: 32, alignItems: "center" },
  emptyBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  bubbleRow: { flexDirection: "row", marginVertical: 2 },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleGif: {
    padding: 0,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  bubbleTextWithGif: { paddingHorizontal: 4, paddingTop: 6 },
  bubbleTextDark: { color: "#1f1414" },
  bubbleMetaOverlay: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bubbleTimeOverlay: { color: "white" },
  bubbleMine: { backgroundColor: "#e8634d", borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: "white" },
  bubbleTextTheirs: { color: "#1f1414" },
  bubbleMetaRow: { flexDirection: "row", alignSelf: "flex-end", marginTop: 4 },
  bubbleTime: { fontSize: 11 },
  editedLabel: { fontSize: 11, fontStyle: "italic" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.75)" },
  bubbleTimeTheirs: { color: "#a08585" },

  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  reactionsRowMine: { alignSelf: "flex-end" },
  reactionsRowTheirs: { alignSelf: "flex-start" },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  reactionChipMine: { backgroundColor: "#fff5f1", borderColor: "#e8634d" },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 12, color: "#7a5f5f", fontWeight: "600" },
  reactionCountMine: { color: "#e8634d" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#f0e4dc",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f5ece4",
    fontSize: 15,
    color: "#1f1414",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8634d",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  recordBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#f0e4dc",
  },
  recordPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e8634d",
  },
  recordTimer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f1414",
    fontVariant: ["tabular-nums"],
    minWidth: 44,
  },
  recordHint: { flex: 1, fontSize: 13, color: "#7a5f5f" },
  recordCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5ece4",
  },
  recordStopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8634d",
    alignItems: "center",
    justifyContent: "center",
  },

  editBarWrap: { backgroundColor: "white", borderTopWidth: 1, borderColor: "#f0e4dc" },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#f3eff8",
  },
  editHeaderLabel: { flex: 1, fontSize: 12, color: "#7065a8", fontWeight: "600" },
  editCancel: { fontSize: 13, color: "#7a5f5f", fontWeight: "500" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 22 },
  menuDivider: { height: 1, backgroundColor: "#f0e4dc" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuRowLabel: { fontSize: 15, color: "#1f1414", fontWeight: "500" },
  menuRowLabelMuted: { color: "#a08585" },

  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1f1414", marginBottom: 6 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
