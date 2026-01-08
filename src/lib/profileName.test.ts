import { describe, it, expect } from "vitest";
import { getProfileDisplayName, getProfileInitials } from "./profileName";

describe("profileName", () => {
  describe("getProfileDisplayName", () => {
    it("should return full name when both first and last names are present", () => {
      expect(getProfileDisplayName({ first_name: "Jean", last_name: "Dupont" })).toBe("Jean Dupont");
    });

    it("should return only first name if last name is missing", () => {
      expect(getProfileDisplayName({ first_name: "Jean", last_name: "" })).toBe("Jean");
      expect(getProfileDisplayName({ first_name: "Jean", last_name: null })).toBe("Jean");
    });

    it("should return only last name if first name is missing", () => {
      expect(getProfileDisplayName({ first_name: "", last_name: "Dupont" })).toBe("Dupont");
      expect(getProfileDisplayName({ first_name: null, last_name: "Dupont" })).toBe("Dupont");
    });

    it("should return 'Sans nom' if both names are missing or empty", () => {
      expect(getProfileDisplayName({ first_name: "", last_name: "" })).toBe("Sans nom");
      expect(getProfileDisplayName(null)).toBe("Sans nom");
      expect(getProfileDisplayName(undefined)).toBe("Sans nom");
    });

    it("should trim whitespace", () => {
      expect(getProfileDisplayName({ first_name: " Jean ", last_name: " Dupont " })).toBe("Jean Dupont");
    });
  });

  describe("getProfileInitials", () => {
    it("should return initials when both first and last names are present", () => {
      expect(getProfileInitials({ first_name: "Jean", last_name: "Dupont" })).toBe("JD");
    });

    it("should return only first initial if last name is missing", () => {
      expect(getProfileInitials({ first_name: "Jean", last_name: "" })).toBe("J");
    });

    it("should return only last initial if first name is missing", () => {
      expect(getProfileInitials({ first_name: "", last_name: "Dupont" })).toBe("D");
    });

    it("should return '?' if both names are missing or empty", () => {
      expect(getProfileInitials({ first_name: "", last_name: "" })).toBe("?");
      expect(getProfileInitials(null)).toBe("?");
    });

    it("should return uppercase initials", () => {
      expect(getProfileInitials({ first_name: "jean", last_name: "dupont" })).toBe("JD");
    });
  });
});
