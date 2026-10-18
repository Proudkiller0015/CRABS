import { describe, it, expect, beforeEach, vi } from "vitest";
import { CrossMod, type SlimeBeepGroup } from "../crossmod";

const group: SlimeBeepGroup = {
  id: "abc12345",
  name: "Slime Squad",
  owner: 20002,
  admins: [20002],
  anyoneCanInvite: false,
  canInvite: false,
  members: [
    { memberNumber: 10001, name: "Me", online: true, role: "member" },
    { memberNumber: 20002, name: "Ann", online: false, role: "owner" },
  ],
  picture: null,
};

/** The page's window, where SlimeBeep puts its API. */
const win = window as Window & { SlimeBeep?: unknown };

/** A stand-in for SlimeBeep's API (window.SlimeBeep.api). */
function mockSlimeBeep(apiVersion = 1) {
  const api = {
    apiVersion,
    groups: vi.fn(() => [group]),
    hasSlimeBeep: vi.fn((n: number) => n === 20002),
    openChat: vi.fn((n: number) => Number.isInteger(n)),
    openGroup: vi.fn((id: string) => id === group.id),
    openInvite: vi.fn((n: number) => Number.isInteger(n)),
    on: vi.fn(() => vi.fn()),
  };
  win.SlimeBeep = { api };
  return api;
}

describe("CrossMod SlimeBeep integration", () => {
  beforeEach(() => {
    delete win.SlimeBeep;
  });

  it("does nothing, safely, without SlimeBeep", () => {
    expect(CrossMod.isSlimeBeepInstalled()).toBe(false);
    expect(CrossMod.hasSlimeBeep(20002)).toBe(false);
    expect(CrossMod.getSlimeBeepGroups()).toEqual([]);
    expect(CrossMod.openSlimeBeepChat(20002)).toBe(false);
    expect(CrossMod.openSlimeBeepGroup(group.id)).toBe(false);
    expect(CrossMod.openSlimeBeepInvite(20002)).toBe(false);
    const stop = CrossMod.onSlimeBeep("presence", () => {});
    expect(stop).toBeTypeOf("function");
    stop();
  });

  it("ignores an API version it was not written for", () => {
    mockSlimeBeep(2);
    expect(CrossMod.isSlimeBeepInstalled()).toBe(false);
    expect(CrossMod.getSlimeBeepGroups()).toEqual([]);
  });

  it("reads who has SlimeBeep and the player's groups", () => {
    mockSlimeBeep();
    expect(CrossMod.isSlimeBeepInstalled()).toBe(true);
    expect(CrossMod.hasSlimeBeep(20002)).toBe(true);
    expect(CrossMod.hasSlimeBeep(30003)).toBe(false);
    expect(CrossMod.getSlimeBeepGroups()).toEqual([group]);
  });

  it("opens SlimeBeep on a chat, a group or an invite", () => {
    const api = mockSlimeBeep();
    expect(CrossMod.openSlimeBeepChat(20002)).toBe(true);
    expect(api.openChat).toHaveBeenCalledWith(20002);
    expect(CrossMod.openSlimeBeepGroup(group.id)).toBe(true);
    expect(CrossMod.openSlimeBeepGroup("unknown1")).toBe(false);
    expect(CrossMod.openSlimeBeepInvite(20002)).toBe(true);
    expect(api.openInvite).toHaveBeenCalledWith(20002);
  });

  it("passes event listeners on and hands back SlimeBeep's stop function", () => {
    const api = mockSlimeBeep();
    const fn = () => {};
    const stop = CrossMod.onSlimeBeep("slimeBeepFriend", fn);
    expect(api.on).toHaveBeenCalledWith("slimeBeepFriend", fn);
    stop();
    expect(api.on.mock.results[0].value).toHaveBeenCalled();
  });

  it("returns safe values when SlimeBeep throws", () => {
    const api = mockSlimeBeep();
    api.groups.mockImplementation(() => {
      throw new Error("boom");
    });
    api.openChat.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(CrossMod.getSlimeBeepGroups()).toEqual([]);
    expect(CrossMod.openSlimeBeepChat(20002)).toBe(false);
  });
});
