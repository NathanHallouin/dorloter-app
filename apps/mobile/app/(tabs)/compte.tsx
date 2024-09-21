/**
 * Onglet Compte — hub de l'espace personnel.
 *
 * Layout : header avec avatar + nom + email, puis liste de rows
 * navigationnels (favoris, signalements, candidatures, notifications,
 * profil), puis logout en bas.
 *
 * Si pas connecté, redirect vers /login (le tap sur le tab est
 * intercepté en amont par le _layout via listener tabPress).
 */

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link, Redirect, useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  clearAuthToken,
  clearDeviceTokenId,
  getAuthToken,
  getDeviceTokenId,
} from "@/lib/auth";
import { unregisterPushDevice } from "@/lib/notifications";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

async function logout() {
  const deviceTokenId = await getDeviceTokenId();
  if (deviceTokenId) {
    await unregisterPushDevice(deviceTokenId);
    await clearDeviceTokenId();
  }
  await clearAuthToken();
}

export default function CompteScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const meQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tokenQuery.data) {
    return <Redirect href="/login" />;
  }

  if (meQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (meQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Session expirée</Text>
        <Text style={styles.errorBody}>{meQuery.error.message}</Text>
        <Pressable
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            await tokenQuery.refetch();
            router.replace("/");
          }}
        >
          <Text style={styles.logoutLabel}>Se reconnecter</Text>
        </Pressable>
      </View>
    );
  }

  const me = meQuery.data;
  const initials = me.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* ─── Header profil ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {me.image ? (
            <Image source={{ uri: me.image }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitials}>{initials || "?"}</Text>
          )}
        </View>
        <Text style={styles.name} testID="compte-name">
          {me.name}
        </Text>
        <Text style={styles.email}>{me.email}</Text>
      </View>

      {/* ─── Sections perso ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionTitle title="Mon activité" />
        <NavRow
          icon="heart"
          label="Mes favoris"
          href="/compte/favoris"
          color="#e8634d"
        />
        <NavRow
          icon="map-marker-question"
          label="Mes signalements"
          href="/compte/signalements"
          color="#c98a2b"
        />
        <NavRow
          icon="file-document-outline"
          label="Mes candidatures"
          href="/compte/candidatures"
          color="#4a9d7a"
        />
        <NavRow
          icon="bell"
          label="Notifications"
          href="/compte/notifications"
          color="#7065a8"
        />
      </View>

      <View style={styles.section}>
        <SectionTitle title="Compte" />
        <NavRow
          icon="account-edit"
          label="Modifier mon profil"
          href="/compte/profil"
          color="#7a5f5f"
        />
      </View>

      {/* ─── Logout ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Pressable
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            await queryClient.invalidateQueries({ queryKey: ["auth"] });
            await queryClient.invalidateQueries({ queryKey: ["me"] });
            router.replace("/");
          }}
        >
          <MaterialCommunityIcons
            name="logout"
            size={18}
            color="#e8634d"
          />
          <Text style={styles.logoutLabel}>Se déconnecter</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function NavRow({
  icon,
  label,
  href,
  color,
}: {
  icon: IconName;
  label: string;
  href: Href;
  color: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: color + "1a" }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color="#a08585"
        />
      </Pressable>
    </Link>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  scroll: { paddingBottom: 32, backgroundColor: "#fafafa" },

  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: "white",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#f0e4dc",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff5f1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e8634d",
  },
  avatarImg: { width: 72, height: 72 },
  avatarInitials: { fontSize: 24, fontWeight: "700", color: "#e8634d" },
  name: { fontSize: 20, fontWeight: "700", color: "#1f1414" },
  email: { fontSize: 14, color: "#7a5f5f" },

  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7a5f5f",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    paddingLeft: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#1f1414" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8634d",
    backgroundColor: "white",
  },
  logoutLabel: { color: "#e8634d", fontWeight: "600", fontSize: 15 },

  errorTitle: { fontSize: 18, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
