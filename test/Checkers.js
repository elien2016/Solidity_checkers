const {
  loadFixture,
  time,
  mineUpTo,
} = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

describe('CheckersTest', function () {
  // test gameplay is based on https://recordsetter.com/world-record/-finish-single-game-checkers/40778 (with video) (Fastest Time To Finish A Single Game Of Checkers)

  async function deployFixture() {
    const [alice, bob, other] = await ethers.getSigners();
    const aliceCommitment = ethers.solidityPackedKeccak256(
      ['uint', 'uint'],
      [10, 4]
    );

    const Checkers = await ethers.getContractFactory('Checkers');
    const checkers = await Checkers.connect(alice).deploy(
      await bob.getAddress(),
      10,
      aliceCommitment,
      { value: 1000 }
    );

    return { checkers, alice, bob, other };
  }

  async function startGameFixture() {
    const { checkers, alice, bob, other } = await loadFixture(deployFixture);

    await checkers.connect(bob).joinGame(173, { value: 1000 });
    await checkers.connect(alice).startGame(10, 4);

    return { checkers, alice, bob, other };
  }

  async function redKingFixture() {
    const { checkers, alice, bob, other } = await loadFixture(startGameFixture);
    const black = bob;
    const red = alice;

    await checkers.connect(black).makeMove(5, 2, 4, 1);
    await checkers.connect(red).makeMove(2, 7, 3, 6);
    await checkers.connect(black).makeMove(5, 4, 4, 5);
    await checkers.connect(red).makeMove(3, 6, 5, 4); // jump
    await checkers.connect(black).makeMove(6, 5, 4, 3); // jump
    await checkers.connect(red).makeMove(2, 3, 3, 4);
    await checkers.connect(black).makeMove(7, 4, 6, 5);
    await checkers.connect(red).makeMove(3, 4, 5, 2); // first part of a double jump
    await checkers.connect(red).makeMove(5, 2, 7, 4); // second part of a double jump

    return { checkers, alice, bob, other };
  }

  async function endGameFixture() {
    const { checkers, alice, bob, other } = await loadFixture(redKingFixture);
    const black = bob;
    const red = alice;

    await checkers.connect(black).makeMove(5, 6, 4, 5);
    await checkers.connect(red).makeMove(7, 4, 5, 6); // first part of a double jump
    await checkers.connect(red).makeMove(5, 6, 3, 4); // second part of a double jump
    await checkers.connect(black).makeMove(7, 2, 6, 3);
    await checkers.connect(red).makeMove(2, 1, 3, 0);
    await checkers.connect(black).makeMove(7, 6, 6, 5);
    await checkers.connect(red).makeMove(3, 0, 5, 2); // first part of a double jump
    await checkers.connect(red).makeMove(5, 2, 7, 4); // second part of a double jump
    await checkers.connect(black).makeMove(5, 0, 4, 1);
    await checkers.connect(red).makeMove(7, 4, 5, 6); // jump
    await checkers.connect(black).makeMove(6, 7, 4, 5); // first part of a double jump
    await checkers.connect(black).makeMove(4, 5, 2, 3); // second part of a double jump
    await checkers.connect(red).makeMove(1, 4, 3, 2); // first part of a tripe jump
    await checkers.connect(red).makeMove(3, 2, 5, 0); // second part of a tripe jump
    await checkers.connect(red).makeMove(5, 0, 7, 2); // third part of a tripe jump
    await checkers.connect(black).makeMove(7, 0, 6, 1);
    await checkers.connect(red).makeMove(7, 2, 5, 0);

    return { checkers, alice, bob, other };
  }

  async function getBalance(signer) {
    return await signer.runner.provider.getBalance(signer.getAddress());
  }

  describe('BeforeGameStart', function () {
    it('The contract should be deployable', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);
    });

    it('Game state should be correctly initialized', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);

      // playerAddresses[0] should be alice's address
      expect(await checkers.playerAddresses(0)).to.equal(
        await alice.getAddress()
      );

      // playerAddresses[1] should be bob's address
      expect(await checkers.playerAddresses(1)).to.equal(
        await bob.getAddress()
      );

      // stake should be 1000 wei
      expect(await checkers.stake()).to.equal(1000);

      // turnLength should be 10 blocks
      expect(await checkers.turnLength()).to.equal(10);

      // turnDeadline should be 11
      expect(await checkers.turnDeadline()).to.equal(11);

      // contract's balance should be 1000 wei
      expect(await getBalance(checkers)).to.equal(1000);
    });

    it('Host should be able to withdraw and end the game before opponent joins', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);

      // alice should be able to withdraw 1000 wei
      await expect(checkers.connect(alice).withdraw()).to.changeEtherBalance(
        alice,
        1000
      );

      // contract's balance should be 0 wei
      expect(await getBalance(checkers)).to.equal(0);

      // game should be ended
      expect(await checkers.ended()).to.be.true;
    });

    it('Host starting game or making move before opponent joins should be rejected', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);

      // alice should not be able to start game
      await expect(checkers.connect(alice).startGame(10, 4)).to.be.reverted;

      // alice should not be able to make move
      await expect(checkers.connect(alice).makeMove(5, 2, 4, 3)).to.be.reverted;
    });

    it('Opponent should be able to join the game', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);

      // bob should be able to join the game
      await expect(checkers.connect(bob).joinGame(173, { value: 1000 })).not.to
        .be.reverted;

      // contract's balance should be 2000 wei
      expect(await getBalance(checkers)).to.equal(2000);

      // playerAddresses[1] should be bob's address
      expect(await checkers.playerAddresses(1)).to.equal(
        await bob.getAddress()
      );

      // bob should be able to join the game only once
      await expect(checkers.connect(bob).joinGame(173, { value: 1000 })).to.be
        .reverted;
    });

    it('Opponent should not be able to join the game when turnDeadline has passed', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);
      const startBlock = await time.latestBlock();

      await mineUpTo(startBlock + 15);
      await expect(checkers.connect(bob).joinGame(173, { value: 1000 })).to.be
        .reverted;
    });

    it('Non-opponent joining the game should be rejected', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);

      // other should not be able to join the game
      await expect(checkers.connect(other).joinGame(173, { value: 1000 })).to.be
        .reverted;
    });
  });

  describe('BeforeGameEnd', function () {
    it('Opponent should be able to withdraw and end the game before host starts the game', async function () {
      const { checkers, alice, bob } = await loadFixture(deployFixture);

      // It should cost bob 1000 wei to join the game
      await expect(
        checkers.connect(bob).joinGame(173, { value: 1000 })
      ).to.changeEtherBalance(bob, -1000);

      // bob should be able to withdraw 1000 wei
      await expect(checkers.connect(bob).withdraw()).to.changeEtherBalance(
        bob,
        1000
      );

      // contract's balance should be 1000 wei
      expect(await getBalance(checkers)).to.equal(1000);

      // game should be ended
      expect(await checkers.ended()).to.be.true;

      // alice should be able to withdraw 1000 wei
      await expect(checkers.connect(alice).withdraw()).to.changeEtherBalance(
        alice,
        1000
      );

      // contract's balance should be 0 wei
      expect(await getBalance(checkers)).to.equal(0);
    });

    it('Host should be able to start the game', async function () {
      const { checkers, alice, bob } = await loadFixture(deployFixture);

      await checkers.connect(bob).joinGame(173, { value: 1000 });
      expect(await checkers.connect(alice).startGame(10, 4)).not.to.be.reverted;
      expect(await checkers.started()).to.be.true;
    });

    it('Host should not be able to start the game when turnDeadline has passed', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);
      const startBlock = await time.latestBlock();

      await checkers.connect(bob).joinGame(173, { value: 1000 });
      await mineUpTo(startBlock + 15);
      await expect(checkers.connect(alice).startGame(10, 4)).to.be.reverted;
    });

    it('Host should not be able to start the game with incorrect nonce or secret', async function () {
      const { checkers, alice, bob, other } = await loadFixture(deployFixture);
      const startBlock = await time.latestBlock();

      await checkers.connect(bob).joinGame(173, { value: 1000 });
      await expect(checkers.connect(alice).startGame(10, 3)).to.be.reverted;
      await expect(checkers.connect(alice).startGame(11, 4)).to.be.reverted;
    });

    it('Players should be able to make regular moves', async function () {
      const { checkers, alice, bob, other } = await loadFixture(
        startGameFixture
      );

      expect(await checkers.currentPlayer()).to.equal(1);
      const black = bob;
      const red = alice;

      await expect(checkers.connect(black).makeMove(5, 2, 4, 1)).not.to.be
        .reverted;
      expect(await checkers.getSquareState(5, 2)).to.equal(0);
      expect(await checkers.getSquareState(4, 1)).to.equal(1);

      await expect(checkers.connect(red).makeMove(2, 7, 3, 6)).not.to.be
        .reverted;
      expect(await checkers.getSquareState(2, 7)).to.equal(0);
      expect(await checkers.getSquareState(3, 6)).to.equal(2);
    });

    it('Players should not be able to make invalid moves', async function () {
      const { checkers, alice, bob, other } = await loadFixture(
        startGameFixture
      );
      const black = bob;
      const red = alice;

      await expect(checkers.connect(black).makeMove(5, 2, 5, 1)).to.be.reverted;
      await expect(checkers.connect(black).makeMove(5, 2, 5, 3)).to.be.reverted;
      await expect(checkers.connect(black).makeMove(5, 2, 4, 2)).to.be.reverted;
      await expect(checkers.connect(black).makeMove(5, 2, 6, 2)).to.be.reverted;
      await expect(checkers.connect(black).makeMove(255, 255, 4, 1)).to.be
        .reverted;
      await expect(checkers.connect(black).makeMove(5, 2, 255, 255)).to.be
        .reverted;
      await expect(checkers.connect(black).makeMove(5, 2, 7, 7)).to.be.reverted;
    });

    it('Player should not be able to make a move when it is not their turn', async function () {
      const { checkers, alice, bob, other } = await loadFixture(
        startGameFixture
      );
      const black = bob;
      const red = alice;

      await expect(checkers.connect(red).makeMove(2, 7, 3, 6)).to.be.reverted;
      await expect(checkers.connect(black).makeMove(5, 2, 4, 1)).not.to.be
        .reverted;
      await expect(checkers.connect(black).makeMove(5, 4, 4, 5)).to.be.reverted;
    });

    it('Player should not be able to make a move when turnDeadline has passed and withdrawl should end the game', async function () {
      const { checkers, alice, bob, other } = await loadFixture(
        startGameFixture
      );
      const black = bob;
      const red = alice;
      const startBlock = await time.latestBlock();

      await mineUpTo(startBlock + 9);
      await expect(checkers.connect(black).makeMove(5, 2, 4, 1)).not.to.be
        .reverted;

      await mineUpTo(startBlock + 20);
      await expect(checkers.connect(red).makeMove(2, 7, 3, 6)).to.be.reverted;

      await expect(checkers.connect(red).withdraw()).to.changeEtherBalance(
        red,
        0
      );
      expect(await checkers.ended()).to.be.true;
      await expect(checkers.connect(black).withdraw()).to.changeEtherBalance(
        black,
        2000
      );
    });

    it('Player must jump if they can jump', async function () {
      const { checkers, alice, bob, other } = await loadFixture(
        startGameFixture
      );
      const black = bob;
      const red = alice;

      await expect(checkers.connect(black).makeMove(5, 2, 4, 1)).not.to.be
        .reverted;
      await expect(checkers.connect(red).makeMove(2, 7, 3, 6)).not.to.be
        .reverted;
      await expect(checkers.connect(black).makeMove(5, 4, 4, 5)).not.to.be
        .reverted;
      await expect(checkers.connect(red).makeMove(2, 3, 3, 4)).to.be.reverted;
      await expect(checkers.connect(red).makeMove(3, 6, 5, 4)).not.to.be
        .reverted;
      expect(await checkers.getSquareState(3, 6)).to.equal(0);
      expect(await checkers.getSquareState(4, 5)).to.equal(0);
      expect(await checkers.getSquareState(5, 4)).to.equal(2);
    });

    it('Player must keep jumping the same piece while a picked piece is jumpable', async function () {
      const { checkers, alice, bob, other } = await loadFixture(
        startGameFixture
      );
      const black = bob;
      const red = alice;

      await expect(checkers.connect(black).makeMove(5, 2, 4, 1)).not.to.be
        .reverted;
      await expect(checkers.connect(red).makeMove(2, 7, 3, 6)).not.to.be
        .reverted;
      await expect(checkers.connect(black).makeMove(5, 4, 4, 5)).not.to.be
        .reverted;
      await expect(checkers.connect(red).makeMove(3, 6, 5, 4)).not.to.be
        .reverted; // jump
      await expect(checkers.connect(black).makeMove(6, 5, 4, 3)).not.to.be
        .reverted; // jump
      await expect(checkers.connect(red).makeMove(2, 3, 3, 4)).not.to.be
        .reverted;
      await expect(checkers.connect(black).makeMove(7, 4, 6, 5)).not.to.be
        .reverted;
      await expect(checkers.connect(red).makeMove(3, 4, 5, 2)).not.to.be
        .reverted; // first part of a double jump
      await expect(checkers.connect(black).makeMove(5, 6, 4, 5)).to.be.reverted;
      await expect(checkers.connect(red).makeMove(2, 1, 3, 0)).to.be.reverted;
      await expect(checkers.connect(red).makeMove(5, 2, 7, 4)).not.to.be
        .reverted; // second part of a double jump
      expect(await checkers.getSquareState(7, 4)).to.equal(4); // red king
    });

    it('Kings should be able to move backwards', async function () {
      const { checkers, alice, bob, other } = await loadFixture(redKingFixture);
      const black = bob;
      const red = alice;

      await expect(checkers.connect(black).makeMove(5, 6, 4, 5)).not.to.be
        .reverted;
      await expect(checkers.connect(red).makeMove(7, 4, 5, 6)).not.to.be
        .reverted; // first part of a double jump
      expect(await checkers.getSquareState(7, 4)).to.equal(0);
      expect(await checkers.getSquareState(6, 5)).to.equal(0);
      expect(await checkers.getSquareState(5, 6)).to.equal(4);
      await expect(checkers.connect(red).makeMove(5, 6, 3, 4)).not.to.be
        .reverted; // second part of a double jump
      expect(await checkers.getSquareState(5, 6)).to.equal(0);
      expect(await checkers.getSquareState(4, 5)).to.equal(0);
      expect(await checkers.getSquareState(3, 4)).to.equal(4);
    });
  });

  describe('AfterGameEnd', function () {
    it("Game should end when one player has no piece left and the winner should get the other player's stake in addition to their own", async function () {
      const { checkers, alice, bob, other } = await loadFixture(endGameFixture);
      const black = bob;
      const red = alice;

      expect(await checkers.ended()).to.be.true;
      expect(await checkers.connect(black).withdraw()).to.changeEtherBalance(
        black,
        0
      );
      expect(await checkers.connect(red).withdraw()).to.changeEtherBalance(
        red,
        2000
      );
    });

    it('The game should end in tie if both players agree', async function () {
      const { checkers, alice, bob, other } = await loadFixture(redKingFixture);
      const black = bob;
      const red = alice;

      expect(await checkers.connect(black).tie()).not.to.be.reverted;
      expect(await checkers.connect(red).tie()).not.to.be.reverted;
      expect(await checkers.connect(black).withdraw()).to.changeEtherBalance(
        black,
        1000
      );
      expect(await checkers.connect(red).withdraw()).to.changeEtherBalance(
        red,
        1000
      );
      expect(await checkers.ended()).to.be.true;
    });
  });
});
