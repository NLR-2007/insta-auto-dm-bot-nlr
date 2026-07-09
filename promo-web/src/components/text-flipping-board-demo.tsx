"use client";
import { useState, useEffect, useCallback } from "react";
import { TextFlippingBoard } from "@/components/ui/text-flipping-board";

const MESSAGES: string[] = [
  "LYVORA AUTOMATION \nBY NLR GROUP \n- NEXT-GEN REACH",
  "COMMENT 'SEND' TO DM \nINSTANT WORKFLOWS \n- 10X CONVERSIONS",
  "SCHEDULE TG POSTS \nAUTO MODERATION RULES \n- SPAM FILTERING",
  "FREE BETA OPEN \nTRY IT TODAY \n- NO CARD REQUIRED",
];

export default function TextFlippingBoardDemo() {
  const [msgIdx, setMsgIdx] = useState(0);

  const next = useCallback(
    () => setMsgIdx((i) => (i + 1) % MESSAGES.length),
    [],
  );

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-8 py-20">
      <TextFlippingBoard text={MESSAGES[msgIdx]} />
    </div>
  );
}
