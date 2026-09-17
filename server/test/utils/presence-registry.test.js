const { expect } = require("chai");

const {
  setReportedStatus,
  computeSnapshot,
  hasChanged,
  commit,
  reset,
} = require("../../utils/presence-registry");

describe("presence registry", () => {
  beforeEach(() => {
    reset();
  });

  it("treats a connected user who never reported as online", () => {
    expect(computeSnapshot(["user-1"])).to.deep.equal([
      { userId: "user-1", status: "online" },
    ]);
  });

  it("keeps the status a client reported about itself", () => {
    setReportedStatus("user-1", "idle");

    expect(computeSnapshot(["user-1", "user-2"])).to.deep.equal([
      { userId: "user-1", status: "idle" },
      { userId: "user-2", status: "online" },
    ]);
  });

  it("forgets the reported status once the user has no socket left", () => {
    setReportedStatus("user-1", "idle");
    computeSnapshot([]);

    expect(computeSnapshot(["user-1"])).to.deep.equal([
      { userId: "user-1", status: "online" },
    ]);
  });

  it("rejects a status it does not know", () => {
    expect(() => setReportedStatus("user-1", "invisible")).to.throw(
      "Unknown presence status",
    );
  });

  it("only reports a change when the snapshot actually differs", () => {
    const first = computeSnapshot(["user-1"]);
    expect(hasChanged(first)).to.equal(true);
    commit(first);

    expect(hasChanged(computeSnapshot(["user-1"]))).to.equal(false);

    setReportedStatus("user-1", "idle");
    expect(hasChanged(computeSnapshot(["user-1"]))).to.equal(true);
  });

  it("does not report a change when only the connection order differs", () => {
    commit(computeSnapshot(["user-1", "user-2"]));

    expect(hasChanged(computeSnapshot(["user-2", "user-1"]))).to.equal(false);
  });
});
