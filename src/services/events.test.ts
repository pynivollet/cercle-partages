import { describe, it, expect, vi } from "vitest";
import { mockSupabase } from "@/test/mocks/supabase";
import { getPublishedEvents, getEventById, registerForEvent } from "./events";

describe("events service", () => {
  describe("getPublishedEvents", () => {
    it("should fetch published events via RPC", async () => {
      const mockEvents = [{ id: "1", title: "Event 1" }];
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockEvents, error: null });

      const { data, error } = await getPublishedEvents();

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_published_events");
      expect(data).toEqual(mockEvents);
      expect(error).toBeNull();
    });

    it("should return error when RPC fails", async () => {
      const mockError = new Error("RPC Error");
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: mockError });

      const { data, error } = await getPublishedEvents();

      expect(data).toBeNull();
      expect(error).toEqual(mockError);
    });
  });

  describe("getEventById", () => {
    it("should fetch event details via RPC", async () => {
      const mockEvent = { id: "1", title: "Event 1" };
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockEvent, error: null });

      const { data, error } = await getEventById("event-123");

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_event_details", { event_uuid: "event-123" });
      expect(data).toEqual(mockEvent);
      expect(error).toBeNull();
    });
  });

  describe("registerForEvent", () => {
    it("should register successfully", async () => {
      const mockRegistration = { id: "reg-1", status: "confirmed" };
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: true, registration: mockRegistration },
        error: null,
      });

      const { data, error } = await registerForEvent("event-123", 2);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("register_for_event", {
        event_uuid: "event-123",
        attendee_count: 2,
      });
      expect(data).toEqual(mockRegistration);
      expect(error).toBeNull();
    });

    it("should handle capacity exceeded error", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: false, error: "CAPACITY_EXCEEDED", message: "Complet" },
        error: null,
      });

      const { data, error, capacityError } = await registerForEvent("event-123");

      expect(data).toBeNull();
      expect(error?.message).toBe("Complet");
      expect(capacityError).toBe(true);
    });
  });
});
