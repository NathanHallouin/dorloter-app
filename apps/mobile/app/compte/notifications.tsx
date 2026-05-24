/**
 * Notifications inbox · `/compte/notifications`.
 *
 * Affiche les notifications persistées en base pour l'utilisateur (alerts
 * push aussi loggées ici). Tap → route mappée via `notificationDataToRoute`.
 *
 * Pas de cursor pagination en MVP (fetch les 50 dernières, suffisant
 * pour un user typique).
 */

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { notificationDataToRoute } from "@/lib/deep-link";
import type { components } from "@dorloter/api-client";

type Notification = components["schemas"]["Notification"];

const TYPE_META: Record<
  | "match_found"
  | "application_update"
  | "new_cat_nearby"
  | "report_nearby"
  | "new_message",
  {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    color: string;
  }
> = {
  match_found: { icon: "magnify-scan", color: "#4a9d7a" },
  application_update: { icon: "file-document-outline", color: "#7065a8" },
  new_cat_nearby: { icon: "paw", color: "#e8634d" },
  report_nearby: { icon: "map-marker-alert", color: "#c98a2b" },
  new_message: { icon: "message-text", color: "#e8634d" },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const notificationsQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await api.GET("/notifications", {
        params: { query: { limit: 50 } },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      await api.POST("/notifications/{id}/read", {
        params: { path: { id } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: async () => {
      await api.POST("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Notifications" }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (!tokenQuery.data) return <Redirect href="/login" />;

  if (notificationsQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Notifications" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Notifications" }} />
        <Text style={styles.errorTitle}>
          Impossible de charger les notifications
        </Text>
        <Text style={styles.errorBody}>
          {notificationsQuery.error.message}
        </Text>
      </View>
    );
  }

  const items = notificationsQuery.data.data;
  const unreadCount = notificationsQuery.data.unreadCount;

  function handlePress(item: Notification) {
    if (!item.isRead) markReadMut.mutate(item.id);
    const route = notificationDataToRoute(
      item.data as Record<string, unknown> | null | undefined
    );
    if (route) router.push(route);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () =>
            unreadCount > 0 ? (
              <Pressable
                onPress={() => markAllReadMut.mutate()}
                disabled={markAllReadMut.isPending}
                style={styles.markAllBtn}
              >
                <Text style={styles.markAllLabel}>Tout marquer lu</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={48}
              color="#c4a89c"
            />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyBody}>
              Tu seras notifié des nouvelles correspondances, mises à jour de
              candidatures et messages.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={notificationsQuery.refetch}
            tintColor="#e8634d"
          />
        }
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type];
          return (
            <Pressable
              style={[styles.row, !item.isRead && styles.rowUnread]}
              onPress={() => handlePress(item)}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: meta.color + "1a" },
                ]}
              >
                <MaterialCommunityIcons
                  name={meta.icon}
                  size={20}
                  color={meta.color}
                />
              </View>
              <View style={styles.body}>
                <Text
                  style={[
                    styles.title,
                    !item.isRead && styles.titleUnread,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.body ? (
                  <Text style={styles.message} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
              </View>
              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
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
    return `aujourd'hui à ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  list: { paddingVertical: 4 },
  separator: { height: 1, backgroundColor: "#f5ece4", marginLeft: 70 },

  markAllBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  markAllLabel: { color: "#e8634d", fontSize: 13, fontWeight: "600" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: "white",
  },
  rowUnread: { backgroundColor: "#fff5f1" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "500", color: "#1f1414" },
  titleUnread: { fontWeight: "700" },
  message: { fontSize: 13, color: "#564545", lineHeight: 18 },
  time: { fontSize: 11, color: "#a08585", marginTop: 2 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e8634d",
  },

  empty: { paddingVertical: 48, alignItems: "center", gap: 8, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  emptyBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
