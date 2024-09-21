/**
 * Onglet Messages — inbox conversations de l'utilisateur courant.
 *
 * Refetch automatique toutes les 15s pour faire vivre la liste (preview
 * du dernier message + compteur unread).
 *
 * Swipe gauche sur une row → bouton "Archiver" qui appelle
 * DELETE /conversations/{id} (soft-archive côté appelant). La conversation
 * disparaît immédiatement (optimistic update) ; elle réapparaîtra si un
 * nouveau message arrive.
 *
 * Vide / non auth : redirect /login (le tab est de toute façon désactivé
 * côté layout quand pas connecté).
 */

import { useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link, Redirect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import type { components } from "@dorloter/api-client";

type InboxItem = components["schemas"]["InboxItem"];

export default function MessagesScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });
  const isAuthed = !!tokenQuery.data;

  const inboxQuery = useQuery({
    enabled: isAuthed,
    queryKey: ["messaging", "inbox", "user"],
    queryFn: async () => {
      const { data, error } = await api.GET("/conversations");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    refetchInterval: 15_000,
  });

  const archiveMut = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await api.DELETE("/conversations/{id}", {
        params: { path: { id: conversationId } },
      });
      if (error) throw new Error(error.error.message);
    },
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({
        queryKey: ["messaging", "inbox", "user"],
      });
      const previous = queryClient.getQueryData<InboxItem[]>([
        "messaging",
        "inbox",
        "user",
      ]);
      queryClient.setQueryData<InboxItem[]>(
        ["messaging", "inbox", "user"],
        (old) => old?.filter((c) => c.id !== conversationId) ?? old
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["messaging", "inbox", "user"],
          context.previous
        );
      }
      Alert.alert("Archivage impossible", err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["messaging", "inbox", "user"],
      });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "unread-count"],
      });
    },
  });

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthed) {
    return <Redirect href="/login" />;
  }

  if (inboxQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (inboxQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Impossible de charger les messages</Text>
        <Text style={styles.errorBody}>{inboxQuery.error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={inboxQuery.data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name="message-text-outline"
            size={48}
            color="#c4a89c"
          />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptyBody}>
            Contacte un refuge depuis la fiche d'un animal pour démarrer un
            échange.
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={inboxQuery.isRefetching}
          onRefresh={inboxQuery.refetch}
          tintColor="#e8634d"
        />
      }
      renderItem={({ item }) => (
        <InboxRow
          item={item}
          onOpen={() => router.push(`/messages/${item.id}`)}
          onArchive={() => archiveMut.mutate(item.id)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

// ─── Row swipeable ──────────────────────────────────────────────────────────

function InboxRow({
  item,
  onOpen,
  onArchive,
}: {
  item: InboxItem;
  onOpen: () => void;
  onArchive: () => void;
}) {
  const swipeRef = useRef<Swipeable | null>(null);

  function handleArchivePress() {
    swipeRef.current?.close();
    onArchive();
  }

  return (
    <Swipeable
      ref={(r) => {
        swipeRef.current = r;
      }}
      overshootRight={false}
      friction={2}
      rightThreshold={48}
      renderRightActions={() => (
        <Pressable
          style={styles.archiveAction}
          onPress={handleArchivePress}
          testID="inbox-archive"
        >
          <MaterialCommunityIcons name="archive" size={22} color="white" />
          <Text style={styles.archiveLabel}>Archiver</Text>
        </Pressable>
      )}
    >
      <Pressable style={styles.row} onPress={onOpen}>
        <View style={styles.avatar}>
          {item.peerImageUrl ? (
            <Image
              source={{ uri: item.peerImageUrl }}
              contentFit="cover"
              style={styles.avatarImg}
            />
          ) : (
            <MaterialCommunityIcons
              name="home-heart"
              size={24}
              color="#a08585"
            />
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.peer} numberOfLines={1}>
              {item.peerName}
            </Text>
            <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          {item.petName ? (
            <Text style={styles.petLine} numberOfLines={1}>
              Au sujet de {item.petName}
            </Text>
          ) : null}
          <View style={styles.previewRow}>
            <Text style={styles.preview} numberOfLines={2}>
              {item.lastMessagePreview ?? "(aucun message)"}
            </Text>
            {item.unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  list: { paddingVertical: 4 },
  separator: { height: 1, backgroundColor: "#f5ece4", marginLeft: 78 },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: "white",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5ece4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  body: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  peer: { fontSize: 15, fontWeight: "600", color: "#1f1414", flex: 1 },
  time: { fontSize: 12, color: "#a08585" },
  petLine: { fontSize: 12, color: "#7a5f5f" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  preview: { flex: 1, fontSize: 13, color: "#564545", lineHeight: 18 },
  badge: {
    backgroundColor: "#e8634d",
    borderRadius: 999,
    paddingHorizontal: 8,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: { color: "white", fontSize: 11, fontWeight: "700" },

  archiveAction: {
    backgroundColor: "#a08585",
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  archiveLabel: { color: "white", fontSize: 11, fontWeight: "600" },

  empty: { padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1414",
    textAlign: "center",
  },
  emptyBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
