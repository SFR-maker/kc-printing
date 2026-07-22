export interface EmojiCategoryDef {
  key: string;
  label: string;
  emoji: string[];
}

export const EMOJI_CATEGORIES: EmojiCategoryDef[] = [
  { key: "smileys", label: "Smileys", emoji: ["😀", "😊", "😎", "🤩", "🥳", "😉", "🙌", "👋", "🤝", "👍"] },
  { key: "hearts", label: "Hearts", emoji: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💯", "✨"] },
  { key: "business", label: "Business", emoji: ["💼", "📈", "📊", "💰", "🏆", "⭐", "🎯", "📌", "📍", "🔑"] },
  { key: "nature", label: "Nature", emoji: ["🌟", "🌿", "🌸", "🌻", "🌊", "☀️", "🌙", "🔥", "❄️", "🌈"] },
  { key: "food", label: "Food", emoji: ["☕", "🍕", "🍰", "🍷", "🍎", "🥐", "🍔", "🍩", "🍦", "🥗"] },
  { key: "objects", label: "Objects", emoji: ["📱", "💻", "📷", "🎨", "✏️", "📚", "🎁", "🛍️", "🚗", "✈️"] },
];
