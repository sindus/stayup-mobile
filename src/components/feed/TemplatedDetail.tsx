import { View, Text, Pressable } from "react-native"
import { Image } from "expo-image"
import type { ProviderTemplate, ResolveCtx } from "@/lib/providerTemplate"
import {
  applyFormat,
  elementCtx,
  makeCtx,
  resolveAccessor,
  resolveCollection,
  resolveText,
} from "@/lib/providerTemplate"
import { formatDate, openUrl } from "@/lib/utils"
import { colors } from "@/theme"
import type { Translations } from "@/lib/translations"

interface TemplatedDetailProps {
  template: ProviderTemplate
  item: Record<string, unknown>
  source?: Record<string, unknown>
  color: string
  dimColor: string
  bodyFontSize: number
  t: Translations
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function absoluteUrl(s: string): string {
  try {
    const u = new URL(s)
    if (u.protocol !== "http:" && u.protocol !== "https:") return ""
    if (u.pathname.startsWith("//")) return ""
    return s
  } catch {
    return ""
  }
}

function OpenButton({
  href,
  label,
  color,
  dimColor,
}: {
  href: string
  label: string
  color: string
  dimColor: string
}) {
  return (
    <Pressable
      onPress={() => void openUrl(href)}
      className="mt-6 rounded-xl px-4 py-3"
      style={{ backgroundColor: dimColor }}
    >
      <Text className="text-center text-base font-medium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  )
}

/** Volet de lecture rendu depuis le template — `detail.mode` pilote tout.
 *  React Native : pas d'iframe ni de HTML brut (le mode `html` est réduit en texte). */
export function TemplatedDetail({
  template,
  item,
  source,
  color,
  dimColor,
  bodyFontSize,
  t,
}: TemplatedDetailProps) {
  const d = template.detail ?? {}
  const ctx: ResolveCtx = makeCtx(template, item, source)
  const fields = template.item?.fields ?? {}

  const title = resolveText(d.title ?? fields.title, ctx)
  const subtitle = resolveText(d.subtitle, ctx)
  const badge = resolveText(d.badge, ctx)
  const dateRaw = resolveAccessor(fields.timestamp, ctx)
  const date = dateRaw
    ? formatDate(String(dateRaw))
    : formatDate(String(item.datetime ?? item.executed_at ?? ""))
  const openHref = absoluteUrl(resolveText(d.openUrl ?? fields.url, ctx))
  const openLabel = d.openLabel || t.viewer.openLink
  const mode = d.mode ?? "text"

  const header = (
    <View className="mb-4">
      {title ? (
        <Text
          className="mb-2 leading-snug"
          style={{ fontSize: bodyFontSize + 6, color: colors.fg, fontFamily: "InstrumentSerif" }}
        >
          {title}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-2">
        {badge ? (
          <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: dimColor }}>
            <Text className="text-sm font-mono font-semibold" style={{ color }}>
              {badge}
            </Text>
          </View>
        ) : null}
        {subtitle ? (
          <Text className="text-sm font-mono" style={{ color }}>
            {subtitle}
          </Text>
        ) : null}
        {date ? (
          <Text className="text-sm font-mono" style={{ color: colors.dim }}>
            {date}
          </Text>
        ) : null}
      </View>
    </View>
  )

  if (mode === "table" || mode === "link-list") {
    const rows = resolveCollection(template, ctx)
    return (
      <View>
        {header}
        <View className="gap-2">
          {rows.map((el, i) => {
            const ectx = elementCtx(ctx, el)
            const rowHref = resolveText(d.rowLink, ectx)
            if (mode === "link-list") {
              const label = resolveText(d.columns?.[0]?.field ?? "title", ectx)
              return (
                <Pressable
                  key={i}
                  onPress={rowHref ? () => void openUrl(rowHref) : undefined}
                  className="py-1"
                >
                  <Text className="text-base" style={{ color }} numberOfLines={2}>
                    {label || rowHref}
                  </Text>
                </Pressable>
              )
            }
            const cols = d.columns ?? []
            return (
              <Pressable
                key={i}
                onPress={rowHref ? () => void openUrl(rowHref) : undefined}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: colors.borderSoft, backgroundColor: colors.surface }}
              >
                {cols.map((col, ci) => {
                  const raw = resolveAccessor(col.field, ectx)
                  const value = applyFormat(raw, col.format)
                  if (value == null || value === "") return null
                  const text = col.prefix ? `${col.prefix}${value}` : String(value)
                  return (
                    <View key={ci} className="flex-row gap-2">
                      <Text className="text-xs font-mono" style={{ color: colors.dim }}>
                        {col.label}
                      </Text>
                      <Text
                        className="flex-1 text-sm"
                        style={{
                          color: col.accent ? color : col.muted ? colors.muted : colors.fgSoft,
                        }}
                        numberOfLines={col.truncate ? 2 : undefined}
                      >
                        {text}
                      </Text>
                    </View>
                  )
                })}
              </Pressable>
            )
          })}
        </View>
        {openHref ? (
          <OpenButton href={openHref} label={openLabel} color={color} dimColor={dimColor} />
        ) : null}
      </View>
    )
  }

  if (mode === "media") {
    const image = resolveText(d.image ?? fields.image, ctx)
    return (
      <View>
        {header}
        {image ? (
          <View className="mb-4 overflow-hidden rounded-xl" style={{ aspectRatio: 16 / 9 }}>
            <Image
              source={{ uri: image }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        ) : null}
        {openHref ? (
          <OpenButton href={openHref} label={openLabel} color={color} dimColor={dimColor} />
        ) : null}
      </View>
    )
  }

  if (mode === "audio") {
    // Pas de lecteur audio natif embarqué (pas de dépendance expo-av) : pochette
    // + notes + bouton qui ouvre le flux dans le lecteur système.
    const cover = resolveText(d.image ?? fields.image, ctx)
    const notes = resolveText(d.body ?? fields.summary, ctx)
    return (
      <View>
        {header}
        {cover ? (
          <View className="mb-4 overflow-hidden rounded-xl" style={{ width: 180, height: 180 }}>
            <Image
              source={{ uri: cover }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        ) : null}
        {notes ? (
          <Text
            className="leading-relaxed"
            style={{ fontSize: bodyFontSize, color: colors.fgSoft }}
          >
            {notes}
          </Text>
        ) : null}
        {openHref ? (
          <OpenButton href={openHref} label={openLabel} color={color} dimColor={dimColor} />
        ) : null}
      </View>
    )
  }

  if (mode === "gallery") {
    const shots = resolveCollection(template, ctx)
    return (
      <View>
        {header}
        <View className="flex-row flex-wrap gap-2">
          {shots.map((el, i) => {
            const ectx = elementCtx(ctx, el)
            const src = resolveText(d.image ?? "$self", ectx)
            const link = resolveText(d.rowLink, ectx)
            const cap = resolveText(d.caption, ectx)
            if (!src) return null
            return (
              <Pressable
                key={i}
                onPress={link ? () => void openUrl(link) : undefined}
                style={{ width: 150 }}
              >
                <View
                  className="overflow-hidden rounded-lg"
                  style={{ width: 150, height: 150, backgroundColor: colors.surface }}
                >
                  <Image
                    source={{ uri: src }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
                {cap ? (
                  <Text className="mt-1 text-sm" style={{ color: colors.dim }} numberOfLines={2}>
                    {cap}
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
        {openHref ? (
          <OpenButton href={openHref} label={openLabel} color={color} dimColor={dimColor} />
        ) : null}
      </View>
    )
  }

  let body = resolveText(d.body ?? fields.summary, ctx)
  if (mode === "html" && body) body = stripHtml(body)

  return (
    <View>
      {header}
      {body ? (
        <Text className="leading-relaxed" style={{ fontSize: bodyFontSize, color: colors.fgSoft }}>
          {body}
        </Text>
      ) : null}
      {openHref ? (
        <OpenButton href={openHref} label={openLabel} color={color} dimColor={dimColor} />
      ) : null}
    </View>
  )
}
