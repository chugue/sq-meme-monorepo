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

        // 1. 생성자로부터 첫 참가비 수령
        require(
            IERC20(_gameToken).transferFrom(msg.sender, address(this), _cost),
            "Initial cost transfer failed"
        );

        gameIdCounter++;

        CommentGame.Params memory params = CommentGame.Params({
            id: gameIdCounter,
            initiator: msg.sender,
            gameToken: _gameToken,
            cost: _cost,
            gameTime: _time
        });

        // 2. 게임 생성 (초기 상금풀 = cost)
        CommentGame newGame = new CommentGame(params, feeCollector, _cost);

        // 3. 토큰을 새 게임 컨트랙트로 전송
        require(
            IERC20(_gameToken).transfer(address(newGame), _cost),
            "Token transfer to game failed"
        );

        deployedGames.push(address(newGame));

        // 4. 토큰 → 게임 정보 매핑 저장 (심볼, 이름 포함)
        gameByToken[_gameToken] = GameInfo({
            gameAddress: address(newGame),
            tokenSymbol: IERC20Metadata(_gameToken).symbol(),
            tokenName: IERC20Metadata(_gameToken).name()
        });

        emit GameCreated(
            newGame.id(),
            address(newGame),
            newGame.gameToken(),
            IERC20Metadata(_gameToken).symbol(),
            IERC20Metadata(_gameToken).name(),
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
