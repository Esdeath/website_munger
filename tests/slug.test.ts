import { describe, expect, it } from "vitest";
import { filePathToSlug, textToSlug } from "../src/lib/slug";

describe("textToSlug", () => {
  it("keeps readable Chinese text and removes punctuation", () => {
    expect(textToSlug("能力圈：知道自己不知道什么")).toBe("能力圈-知道自己不知道什么");
  });

  it("normalizes spaces and latin text", () => {
    expect(textToSlug("GEICO / 政府雇员保险")).toBe("geico-政府雇员保险");
  });
});

describe("filePathToSlug", () => {
  it("uses the file basename without extension", () => {
    expect(filePathToSlug("articles/能力圈-知道自己不知道什么.md")).toBe("能力圈-知道自己不知道什么");
  });

  it("normalizes source file punctuation", () => {
    expect(filePathToSlug("speech/查理芒格：2023年《最后的访谈CNBC》.md")).toBe(
      "查理芒格-2023年-最后的访谈cnbc"
    );
  });
});
