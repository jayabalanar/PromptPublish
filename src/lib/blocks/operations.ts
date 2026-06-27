import { z } from "zod";
import type { Block } from "./types";

export const EditTextOpSchema = z.object({
  operation: z.literal("edit-text"),
  blockId: z.string(),
  field: z.string(),
  value: z.string(),
});

export const SwapImageOpSchema = z.object({
  operation: z.literal("swap-image"),
  blockId: z.string(),
  field: z.string(),
  src: z.string(),
  alt: z.string(),
});

export const AddBlockOpSchema = z.object({
  operation: z.literal("add-block"),
  afterBlockId: z.string().optional(),
  block: z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()),
  }),
});

export const ReorderBlockOpSchema = z.object({
  operation: z.literal("reorder-block"),
  blockId: z.string(),
  afterBlockId: z.string().nullable(),
});

export const RemoveBlockOpSchema = z.object({
  operation: z.literal("remove-block"),
  blockId: z.string(),
});

export const BlockOperationSchema = z.discriminatedUnion("operation", [
  EditTextOpSchema,
  SwapImageOpSchema,
  AddBlockOpSchema,
  ReorderBlockOpSchema,
  RemoveBlockOpSchema,
]);

export type BlockOperation = z.infer<typeof BlockOperationSchema>;

export function applyOperation(blocks: Block[], op: BlockOperation): Block[] {
  switch (op.operation) {
    case "edit-text": {
      return blocks.map((b) => {
        if (b.id !== op.blockId) return b;
        return { ...b, props: setNestedField(b.props as Record<string, unknown>, op.field, op.value) } as Block;
      });
    }
    case "swap-image": {
      return blocks.map((b) => {
        if (b.id !== op.blockId) return b;
        return {
          ...b,
          props: setNestedField(b.props as Record<string, unknown>, op.field, { src: op.src, alt: op.alt }),
        } as Block;
      });
    }
    case "add-block": {
      const newBlock = op.block as Block;
      if (!op.afterBlockId) return [...blocks, newBlock];
      const idx = blocks.findIndex((b) => b.id === op.afterBlockId);
      if (idx === -1) return [...blocks, newBlock];
      return [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    }
    case "reorder-block": {
      const moving = blocks.find((b) => b.id === op.blockId);
      if (!moving) return blocks;
      const rest = blocks.filter((b) => b.id !== op.blockId);
      if (op.afterBlockId === null) return [moving, ...rest];
      const idx = rest.findIndex((b) => b.id === op.afterBlockId);
      if (idx === -1) return [...rest, moving];
      return [...rest.slice(0, idx + 1), moving, ...rest.slice(idx + 1)];
    }
    case "remove-block": {
      return blocks.filter((b) => b.id !== op.blockId);
    }
  }
}

function setNestedField(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const parts = path.split(".");
  if (parts.length === 1) return { ...obj, [path]: value };
  const [head, ...rest] = parts;
  return {
    ...obj,
    [head]: setNestedField((obj[head] as Record<string, unknown>) ?? {}, rest.join("."), value),
  };
}
