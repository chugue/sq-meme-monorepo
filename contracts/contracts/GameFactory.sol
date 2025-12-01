// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CommentGame.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract GameFactory is Ownable {
    uint256 public gameIdCounter;
    address public feeCollector;
    address[] public deployedGames;

    // 게임 정보 구조체
    struct GameInfo {
        address gameAddress;
        string tokenSymbol;
        string tokenName;
    }

    // 토큰 주소 → 게임 정보 매핑 (1 토큰 = 1 게임)
    mapping(address => GameInfo) public gameByToken;

    event GameCreated(
        uint256 gameId,
        address indexed gameAddr,
        address indexed gameTokenAddr,
        string tokenSymbol,
        string tokenName,
        address initiator,
        uint256 gameTime,
        uint256 endTime,
        uint256 cost,
        uint256 prizePool,
        address lastCommentor,
        bool isClaimed
    );

    constructor(address _feeCollector) Ownable(msg.sender) {
        feeCollector = _feeCollector;
    }

    function createGame(
        address _gameToken,
        uint256 _time,
        uint _cost
    ) external {
        // 0. 해당 토큰으로 이미 게임이 있는지 확인
        address existingGame = gameByToken[_gameToken].gameAddress;
        if (existingGame != address(0)) {
            // 기존 게임이 있으면, 종료되었는지 확인 (시간 만료)
            CommentGame game = CommentGame(existingGame);
            require(block.timestamp >= game.endTime(), "Active game already exists for this token");
        }

        // 게임 생성은 무료 - 첫 댓글부터 토큰 필요

        gameIdCounter++;

        // 토큰 메타데이터 조회
        string memory _tokenSymbol = IERC20Metadata(_gameToken).symbol();
        string memory _tokenName = IERC20Metadata(_gameToken).name();

        CommentGame.Params memory params = CommentGame.Params({
            id: gameIdCounter,
            initiator: msg.sender,
            gameToken: _gameToken,
            cost: _cost,
            gameTime: _time,
            tokenSymbol: _tokenSymbol
        });

        // 게임 생성 (초기 상금풀 = 0)
        CommentGame newGame = new CommentGame(params, feeCollector, 0);

        deployedGames.push(address(newGame));

        // 5. 토큰 → 게임 정보 매핑 저장
        gameByToken[_gameToken] = GameInfo({
            gameAddress: address(newGame),
            tokenSymbol: _tokenSymbol,
            tokenName: _tokenName
        });

        emit GameCreated(
            newGame.id(),
            address(newGame),
            newGame.gameToken(),
            _tokenSymbol,
            _tokenName,
            newGame.initiator(),
            newGame.gameTime(),
            newGame.endTime(),
            newGame.cost(),
            newGame.prizePool(),
            newGame.lastCommentor(),
            newGame.isClaimed()
        );
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        feeCollector = _newCollector;
    }
}
