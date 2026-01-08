import { describe, it, expect, vi } from "vitest";
import { mockSupabase } from "@/test/mocks/supabase";
import { getPresentationsByPresenter } from "./presentations";

describe("presentations service", () => {
  it("should fetch presentations by presenter id", async () => {
    const mockData = [{ id: "1", title: "Test Presentation" }];
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any);

    const { data, error } = await getPresentationsByPresenter("presenter-123");

    expect(mockSupabase.from).toHaveBeenCalledWith("presentations");
    expect(data).toEqual(mockData);
    expect(error).toBeNull();
  });

  it("should return error when fetch fails", async () => {
    const mockError = new Error("Fetch failed");
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    } as any);

    const { data, error } = await getPresentationsByPresenter("presenter-123");

    expect(data).toBeNull();
    expect(error).toEqual(mockError);
  });
});
