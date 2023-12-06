pragma solidity ^0.8.9;

contract Checkers {
  enum SquareState { Empty, Black, Red, BlackKing, RedKing }
  enum PlayerColor { Black, Red }

  address[2] public playerAddresses;
  mapping(address => uint) playerBalances;
  PlayerColor[2] public playerColors;
  uint public stake;

  bytes32 p1Commitment;
  uint128 p2Nonce;

  uint8[8][8] public board;
  uint8 public currentPlayer;
  uint32 public turnLength;
  uint256 public turnDeadline;
  uint256 public started;
  uint256 public ended;

  uint8 public numBlackPieces;
  uint8 public numRedPieces;
  uint8[8][8] blackJumps;
  uint8[8][8] redJumps;
  uint8 numBlackJumps;
  uint8 numRedJumps;
  uint8[2] continuePiece;

  constructor(address opponent, uint32 _turnLength, bytes32 _p1Commitment) public payable {
    playerAddresses[0] = msg.sender;
    playerAddresses[1] = opponent;
    playerBalances[playerAddresses[0]] = msg.value;
    stake = msg.value;

    turnLength = _turnLength;
    turnDeadline = block.number + turnLength;
    p1Commitment = _p1Commitment;
  }
 
  function joinGame(uint128 _p2Nonce) public payable {
    require(block.number <= turnDeadline);
    require(msg.sender == playerAddresses[1]);
    require(msg.value >= stake, "Insufficient stake");

    playerBalances[playerAddresses[1]] = msg.value;
    p2Nonce = _p2Nonce;
    turnDeadline = block.number + turnLength;
  }

  function initBoard() internal {
    board[0][1] = SquareState.Red;
    board[0][3] = SquareState.Red;
    board[0][5] = SquareState.Red;
    board[0][7] = SquareState.Red;
    board[1][0] = SquareState.Red;
    board[1][2] = SquareState.Red;
    board[1][4] = SquareState.Red;
    board[1][6] = SquareState.Red;
    board[2][1] = SquareState.Red;
    board[2][3] = SquareState.Red;
    board[2][5] = SquareState.Red;
    board[2][7] = SquareState.Red;
    board[5][0] = SquareState.Black;
    board[5][2] = SquareState.Black;
    board[5][4] = SquareState.Black;
    board[5][6] = SquareState.Black;
    board[6][1] = SquareState.Black;
    board[6][3] = SquareState.Black;
    board[6][5] = SquareState.Black;
    board[6][7] = SquareState.Black;
    board[7][0] = SquareState.Black;
    board[7][2] = SquareState.Black;
    board[7][4] = SquareState.Black;
    board[7][6] = SquareState.Black;
  }

  function startGame(uint128 p1Nonce) public {
    require(!started);
    require(block.number <= turnDeadline, "Game is over");
    require(sha3(p1Nonce) == p1Commitment, "Nonce does not check out");

    started = true;
    initBoard();
    numBlackPieces = 12;
    numRedPieces = 12;
    continuePiece = [-1, -1];
    currentPlayer = (p1Nonce ^ p2Nonce) & 0x01;
    playerColors[currentPlayer] = PlayerColor.Black;
    playerColors[currentPlayer ^ 0x01] = PlayerColor.Red;
    turnDeadline = block.number + turnLength;
  }

  function isJumpable(uint8 direction, uint8 i, uint8 j, PlayerColor playerColor) internal {
    x = i + direction;
    y1 = j - 1;
    y2 = j + 1;
    x_ = i + direction * 2;
    y1_ = j - 2;
    y2_ = j + 2;

    if (playerColor == PlayerColor.Black) {
      return (x >= 0 && x <= 7 && x_ >= 0 && x_ <= 7 && 
      (y1 >= 0 && y1 <= 7 && (board[x][y1] == SquareState.Red || board[x][y1] == SquareState.RedKing) && 
      y1_ >= 0 && y1_ <= 7 && board[x_][y1_] == SquareState.Empty) || 
      (y2 >= 0 && y2 <= 7 && (board[x][y2] == SquareState.Red || board[x][y2] == SquareState.RedKing) && 
      y2_ >= 0 && y2_ <= 7 && board[x_][y2_] == SquareState.Empty)
      );
    } else {
      return (x >= 0 && x <= 7 && x_ >= 0 && x_ <= 7 && 
      (y1 >= 0 && y1 <= 7 && (board[x][y1] == SquareState.Black || board[x][y1] == SquareState.BlackKing) && 
      y1_ >= 0 && y1_ <= 7 && board[x_][y1_] == SquareState.Empty) || 
      (y2 >= 0 && y2 <= 7 && (board[x][y2] == SquareState.Black || board[x][y2] == SquareState.BlackKing) && 
      y2_ >= 0 && y2_ <= 7 && board[x_][y2_] == SquareState.Empty)
      );
    }
  }

  function checkJumps(PlayerColor playerColor) internal {
    uint8[8][8] jumps;
    uint8 numJumps;

    if (playerColor == PlayerColor.Black) {
      for (uint8 i = 0; i < 8; i++) {
        for (uint8 j = 0; i < 8; j++) {
          if (board[i][j] == SquareState.Black || board[i][j] == SquareState.BlackKing) {
            if (isJumpable(-1, i, j, playerColor)) {
              jumps[i][j] = 1;
              numJumps += 1;
              continue;
            }

            if (board[i][j] == SquareState.BlackKing) {
              jumps[i][j] = isJumpable(1, i, j, playerColor);
              numJumps += jumps[i][j];
            }
          }
        }
      }

      redJumps = jumps;
      numRedJumps = numJumps;
    } else {
      for (uint i = 0; i < 8; i++) {
        for (uint j = 0; i < 8; j++) {
          if (board[i][j] == SquareState.Red || board[i][j] == SquareState.RedKing) {
            if (isJumpable(1, i, j, playerColor)) {
              jumps[i][j] = 1;
              numJumps += 1;
              continue;
            }

            if (board[i][j] == SquareState.RedKing) {
              jumps[i][j] = isJumpable(-1, i, j, playerColor);
              numJumps += jumps[i][j];
            }
          }
        }
      }

      blackJumps = jumps;
      numBlackJumps = numJumps;
    }
  }
  
  function makeMove(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) public {
    require(!ended, "Game is over");
    require(msg.sender == playerAddresses[currentPlayer], "Not your turn");
    require(fromX >= 0 && fromX <= 7 && fromY >= 0 && fromY <= 7 && toX >= 0 && toX <= 7 && toY >= 0 && toY <= 7, "Out of bounds");
    if (continuePiece[0] != -1 && continuePiece[1] != -1) {
      require(fromX == continuePiece[0] && fromY == continuePiece[1], "Must keep jumping with the previous piece");
    }
    require(board[toX][toY] == SquareState.Empty, "Destination already occupied");

    PlayerColor playerColor = playerColors[currentPlayer];
    SquareState piece = board[fromX][fromY];
    bool keepJumping = false;
    if (playerColor == PlayerColor.Black) {
      require(board[fromX][fromY] == SquareState.Black || board[fromX][fromY] == SquareState.BlackKing, "Invalid piece");
      if (numBlackJumps == 0) {
        if (board[fromX][fromY] == SquareState.Black) {
          require(toX == fromX - 1 && (toY == fromY - 1 || toY == fromY + 1));
        } else {
          require((toX == fromX - 1 || toX == fromX + 1) && (toY == fromY - 1 || toY == fromY + 1));
        }
      } else {
        require(blackJumps[fromX][fromY] == 1 || continuePiece[0] != -1 && continuePiece[1] != -1);
        board[(fromX + toX) / 2][(fromY + toY) / 2] = SquareState.Empty;
        numRedPieces -= 1;
        if (isJumpable(-1, toX, toY, PlayerColor) || piece == SquareState.BlackKing && isJumpable(1, toX, toY, playerColor)) {
          continuePiece = [toX, toY];
          keepJumping = true;
        }
      }

      // Upgrade to King
      if (toX == 0) {
        piece = SquareState.BlackKing;
      }
    } else {
      require(board[fromX][fromY] == SquareState.Red || board[fromX][fromY] == SquareState.RedKing, "Invalid piece");
      if (numRedJumps == 0) {
        if (board[fromX][fromY] == SquareState.Red) {
          require(toX == fromX + 1 && (toY == fromY - 1 || toY == fromY + 1));
        } else {
          require((toX == fromX + 1 || toX == fromX - 1) && (toY == fromY - 1 || toY == fromY + 1));
        }
      } else {
        require(redJumps[fromX][fromY] == 1 || continuePiece[0] != -1 && continuePiece[1] != -1);
        board[(fromX + toX) / 2][(fromY + toY) / 2] = SquareState.Empty;
        numBlackPieces -= 1;
        if (isJumpable(1, toX, toY, PlayerColor) || piece == SquareState.RedKing && isJumpable(-1, toX, toY, playerColor)) {
          continuePiece = [toX, toY];
          keepJumping = true;
        }
      }

      // Upgrade to King
      if (toX == 7) {
        piece = SquareState.RedKing;
      }
    }

    board[fromX][fromY] = SquareState.Empty;
    board[toX][toY] = piece;

    uint8 opponent = currentPlayer ^ 0x01;
    if (numBlackPieces == 0 || numRedPieces == 0) {
      playerBalances[playerAddresses[currentPlayer]] += playerBalances[playerAddresses[opponent]];
      ended = true;
      return;
    }

    if (!keepJumping) {
      currentPlayer ^= 0x01;
      checkJumps(playerColors[opponent]);
      continuePiece = [-1, -1];
    }
    turnDeadline = block.number + turnLength;
  }

  function withdraw() public {
    require(block.number > turnDeadline);

    uint amount = _playerBalances[msg.sender];
    if (amount > 0) {
      _playerBalances[msg.sender] = 0;

      if (!payable(msg.sender).send(amount)) {
          _playerBalances[msg.sender] = amount;
      }
    }
  }
}
