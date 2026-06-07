const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const DAY = 24 * 60 * 60;
const REWARD = ethers.parseEther("5"); // 5 MON

describe("ChainMind", function () {
  // Deploy all three contracts and wire them together, mirroring the real deploy script.
  async function deployFixture() {
    const [owner, verifier, poster, agentA, agentB, outsider] = await ethers.getSigners();

    const Reputation = await ethers.getContractFactory("ReputationStore");
    const reputation = await Reputation.deploy();

    const Registry = await ethers.getContractFactory("AgentRegistry");
    const registry = await Registry.deploy();

    const threshold = 1n; // score >= 1 => trusted
    const Marketplace = await ethers.getContractFactory("TaskMarketplace");
    const marketplace = await Marketplace.deploy(
      registry.target,
      reputation.target,
      verifier.address,
      threshold
    );

    // Two-step wiring: only the marketplace may increment reputation.
    await reputation.setAuthorizedCaller(marketplace.target);

    // Register two agents (self-sovereign: each registers from its own wallet).
    await registry.connect(agentA).register("DataBot-7", "Research specialist", ["research", "analysis"]);
    await registry.connect(agentB).register("WriterAgent-12", "Writing specialist", ["writing"]);

    return { owner, verifier, poster, agentA, agentB, outsider, reputation, registry, marketplace, threshold };
  }

  // -------------------------------------------------------------------
  describe("AgentRegistry", function () {
    it("registers an agent and exposes it via getAgent / getAllAgents", async function () {
      const { registry, agentA } = await loadFixture(deployFixture);
      const a = await registry.getAgent(agentA.address);
      expect(a.name).to.equal("DataBot-7");
      expect(a.wallet).to.equal(agentA.address);
      expect(a.exists).to.equal(true);
      expect(await registry.getAgentCount()).to.equal(2n);
      expect(await registry.getAllAgents()).to.have.length(2);
    });

    it("rejects duplicate registration", async function () {
      const { registry, agentA } = await loadFixture(deployFixture);
      await expect(
        registry.connect(agentA).register("Dupe", "x", [])
      ).to.be.revertedWith("AgentRegistry: already registered");
    });

    it("rejects an empty name", async function () {
      const { registry, outsider } = await loadFixture(deployFixture);
      await expect(
        registry.connect(outsider).register("", "x", [])
      ).to.be.revertedWith("AgentRegistry: name required");
    });
  });

  // -------------------------------------------------------------------
  describe("ReputationStore", function () {
    it("blocks increment from anyone but the authorized marketplace", async function () {
      const { reputation, agentA, outsider } = await loadFixture(deployFixture);
      await expect(
        reputation.connect(outsider).increment(agentA.address, 1)
      ).to.be.revertedWith("ReputationStore: not authorized");
    });

    it("only owner can set the authorized caller", async function () {
      const { reputation, outsider } = await loadFixture(deployFixture);
      await expect(
        reputation.connect(outsider).setAuthorizedCaller(outsider.address)
      ).to.be.revertedWith("ReputationStore: not owner");
    });
  });

  // -------------------------------------------------------------------
  describe("TaskMarketplace — core flow", function () {
    it("posts a funded task (escrow held by the contract)", async function () {
      const { marketplace, poster } = await loadFixture(deployFixture);
      await expect(
        marketplace.connect(poster).postTask("Summarize DePIN trends", "Research", DAY, { value: REWARD })
      )
        .to.emit(marketplace, "TaskPosted")
        .withArgs(1, poster.address, "Research", REWARD, anyValue());

      expect(await ethers.provider.getBalance(marketplace.target)).to.equal(REWARD);
      const t = await marketplace.getTask(1);
      expect(t.status).to.equal(0); // Open
      expect(t.reward).to.equal(REWARD);
    });

    it("rejects a task with no reward", async function () {
      const { marketplace, poster } = await loadFixture(deployFixture);
      await expect(
        marketplace.connect(poster).postTask("x", "Research", DAY, { value: 0 })
      ).to.be.revertedWith("Marketplace: reward required");
    });

    it("only the verifier can assign", async function () {
      const { marketplace, poster, agentA } = await loadFixture(deployFixture);
      await marketplace.connect(poster).postTask("x", "Research", DAY, { value: REWARD });
      await expect(
        marketplace.connect(poster).assignTask(1, agentA.address)
      ).to.be.revertedWith("Marketplace: not verifier");
    });

    it("new agent (rep 0) → escrow path; completeTask pays agent and bumps reputation", async function () {
      const { marketplace, reputation, verifier, poster, agentA } = await loadFixture(deployFixture);
      await marketplace.connect(poster).postTask("Summarize DePIN", "Research", DAY, { value: REWARD });

      // agentA has score 0 < threshold(1) => NOT trusted => escrow path
      await expect(marketplace.connect(verifier).assignTask(1, agentA.address))
        .to.emit(marketplace, "TaskAssigned")
        .withArgs(1, agentA.address, false);

      const resultHash = ethers.id("the-claude-result");
      await expect(
        marketplace.connect(verifier).completeTask(1, resultHash)
      ).to.changeEtherBalance(agentA, REWARD);

      const t = await marketplace.getTask(1);
      expect(t.status).to.equal(2); // Completed
      expect(t.resultHash).to.equal(resultHash);
      expect(await reputation.getScore(agentA.address)).to.equal(1n);
      expect(await reputation.getHistory(agentA.address)).to.deep.equal([1n]);
    });

    it("trusted agent (rep ≥ threshold) → instant-settle path flagged true", async function () {
      const { marketplace, verifier, poster, agentA } = await loadFixture(deployFixture);

      // First task lifts agentA to score 1 (== threshold).
      await marketplace.connect(poster).postTask("t1", "Research", DAY, { value: REWARD });
      await marketplace.connect(verifier).assignTask(1, agentA.address);
      await marketplace.connect(verifier).completeTask(1, ethers.id("r1"));

      // Second task: agentA is now trusted → instantSettle = true.
      await marketplace.connect(poster).postTask("t2", "Research", DAY, { value: REWARD });
      await expect(marketplace.connect(verifier).assignTask(2, agentA.address))
        .to.emit(marketplace, "TaskAssigned")
        .withArgs(2, agentA.address, true);
    });

    it("rejects assigning an unregistered agent", async function () {
      const { marketplace, verifier, poster, outsider } = await loadFixture(deployFixture);
      await marketplace.connect(poster).postTask("x", "Research", DAY, { value: REWARD });
      await expect(
        marketplace.connect(verifier).assignTask(1, outsider.address)
      ).to.be.revertedWith("Marketplace: agent not registered");
    });
  });

  // -------------------------------------------------------------------
  describe("TaskMarketplace — cancel & reclaim", function () {
    it("poster cancels an open task and is refunded", async function () {
      const { marketplace, poster } = await loadFixture(deployFixture);
      await marketplace.connect(poster).postTask("x", "Research", DAY, { value: REWARD });
      await expect(marketplace.connect(poster).cancelTask(1)).to.changeEtherBalance(poster, REWARD);
      expect((await marketplace.getTask(1)).status).to.equal(3); // Cancelled
    });

    it("reclaim blocked before deadline, allowed after", async function () {
      const { marketplace, verifier, poster, agentA } = await loadFixture(deployFixture);
      await marketplace.connect(poster).postTask("x", "Research", DAY, { value: REWARD });
      await marketplace.connect(verifier).assignTask(1, agentA.address);

      await expect(marketplace.connect(poster).reclaim(1)).to.be.revertedWith("Marketplace: before deadline");

      await time.increase(DAY + 1);
      await expect(marketplace.connect(poster).reclaim(1)).to.changeEtherBalance(poster, REWARD);
      expect((await marketplace.getTask(1)).status).to.equal(4); // Reclaimed
    });

    it("cannot reclaim a completed task", async function () {
      const { marketplace, verifier, poster, agentA } = await loadFixture(deployFixture);
      await marketplace.connect(poster).postTask("x", "Research", DAY, { value: REWARD });
      await marketplace.connect(verifier).assignTask(1, agentA.address);
      await marketplace.connect(verifier).completeTask(1, ethers.id("r"));
      await time.increase(DAY + 1);
      await expect(marketplace.connect(poster).reclaim(1)).to.be.revertedWith("Marketplace: not reclaimable");
    });
  });

  // -------------------------------------------------------------------
  describe("TaskMarketplace — x402 instant delegation pay", function () {
    it("pays a trusted agent instantly with no escrow", async function () {
      const { marketplace, verifier, poster, agentA, agentB } = await loadFixture(deployFixture);

      // Lift agentB to trusted (score 1).
      await marketplace.connect(poster).postTask("seed", "Writing", DAY, { value: REWARD });
      await marketplace.connect(verifier).assignTask(1, agentB.address);
      await marketplace.connect(verifier).completeTask(1, ethers.id("r"));

      const fee = ethers.parseEther("0.5");
      await expect(
        marketplace.connect(agentA).payAgentInstant(agentB.address, 1, { value: fee })
      )
        .to.emit(marketplace, "InstantPayment")
        .withArgs(agentA.address, agentB.address, 1, fee);
    });

    it("refuses instant pay to an untrusted (rep 0) agent", async function () {
      const { marketplace, agentA, agentB } = await loadFixture(deployFixture);
      await expect(
        marketplace.connect(agentA).payAgentInstant(agentB.address, 0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Marketplace: agent not trusted");
    });
  });
});

// Helper: chai matcher for "any value" in event args (used for timestamp-derived deadline).
function anyValue() {
  return require("@nomicfoundation/hardhat-chai-matchers/withArgs").anyValue;
}
