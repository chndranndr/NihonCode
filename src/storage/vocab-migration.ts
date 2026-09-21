/**
 * Phase 3 loader swap migration: remaps progress rows from pre-curation N5
 * vocab ids to the re-keyed clean ids, armed in NihonDb as
 * `this.version(4).upgrade(upgradeVocabN5Rekeys)` in the same change as the
 * loader swap (docs/decisions.md "N5 vocab re-key migration sequencing").
 * The map lives here with its upgrade so db.ts never imports its own
 * dependent.
 */
import type { Transaction } from "dexie";

/**
 * Phase 2 curation re-keyed graded N5 vocab entries whose stored kana was
 * wrong for the meaning (一日|ついたち → いちにち, …). vocabId embeds kana, so
 * the clean IDs changed; shipped progress rows (srsCards keyed by id,
 * drillAttempts/reviewLogs by itemId/cardId) still held the old keys until
 * this migration. scripts/check-rekeys.mjs asserts this map against the final
 * clean pool.
 */
export const VOCAB_N5_REKEYS: Readonly<Record<string, string>> = {
  "vocab:n5:一日|ついたち": "vocab:n5:一日|いちにち",
  "vocab:n5:年|ねん": "vocab:n5:年|とし",
  "vocab:n5:お巡りさん|おめぐりさん": "vocab:n5:お巡りさん|おまわりさん",
  "vocab:n5:お腹|おはら": "vocab:n5:お腹|おなか",
  "vocab:n5:お金|おきん": "vocab:n5:お金|おかね",
  "vocab:n5:ご飯|ごめし": "vocab:n5:ご飯|ごはん",
  "vocab:n5:人|にん": "vocab:n5:人|ひと",
  "vocab:n5:今年|こんねん": "vocab:n5:今年|ことし",
  "vocab:n5:後|のち": "vocab:n5:後|あと",
  "vocab:n5:戸|こ": "vocab:n5:戸|と",
  "vocab:n5:方|ほう": "vocab:n5:方|かた",
  "vocab:n5:昼ご飯|ひるごめし": "vocab:n5:昼ご飯|ひるごはん",
  "vocab:n5:晩ご飯|ばんごめし": "vocab:n5:晩ご飯|ばんごはん",
  "vocab:n5:朝ご飯|あさごめし": "vocab:n5:朝ご飯|あさごはん",
  "vocab:n5:真っ直ぐ|まっすぐぐ": "vocab:n5:真っ直ぐ|まっすぐ",
  "vocab:n5:角|かく": "vocab:n5:角|かど",
  "vocab:n5:入る|いる": "vocab:n5:入る|はいる",
  "vocab:n5:開く|ひらく": "vocab:n5:開く|あく",
  "vocab:n5:開ける|ひらける": "vocab:n5:開ける|あける",
  "vocab:n5:可愛い|かわい": "vocab:n5:可愛い|かわいい",
  "vocab:n5:小さい|ちーさい": "vocab:n5:小さい|ちいさい",
  "vocab:n5:温い|ぬくい": "vocab:n5:温い|ぬるい",
  "vocab:n5:細い|こまい": "vocab:n5:細い|ほそい",
  "vocab:n5:辛い|つらい": "vocab:n5:辛い|からい",
};

export async function upgradeVocabN5Rekeys(tx: Transaction): Promise<void> {
  const cards = tx.table("srsCards");
  for (const [oldId, newId] of Object.entries(VOCAB_N5_REKEYS)) {
    const old = await cards.get(oldId);
    if (!old) continue;
    const existing = await cards.get(newId);
    // Collision merge: the richer row wins (more reps; tie: newer lastReview).
    const keepOld =
      !existing ||
      old.reps > existing.reps ||
      (old.reps === existing.reps && (old.lastReview ?? 0) >= (existing.lastReview ?? 0));
    await cards.delete(oldId);
    if (keepOld) await cards.put({ ...old, id: newId });
  }
  const remapField = async (table: string, field: string) => {
    await tx
      .table(table)
      .toCollection()
      .modify((row: { [key: string]: unknown }) => {
        const next = VOCAB_N5_REKEYS[row[field] as string];
        if (next) row[field] = next;
      });
  };
  await remapField("drillAttempts", "itemId");
  await remapField("reviewLogs", "cardId");
}
