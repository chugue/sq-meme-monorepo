// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CommentGame.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameFactory is Ownable {
    uint256 public gameIdCounter;
    address public feeCollector;
    address[] public deployedGames;

    event GameCreated(
        uint256 gameId,
        address indexed gameAddr,
        address indexed gameTokenAddr,
        address initiator,
        uint256 gameTime,
        uint256 endTime,
        uint256 cost,
        uint256 prizePool,
        address lastCommentor,
        bool isEnded
    );

    constructor(address _feeCollector) Ownable(msg.sender) {
        feeCollector = _feeCollector;
    }

    function createGame(
        address _gameToken,
        uint256 _time,
        uint _cost
    ) external {
        gameIdCounter++;

        CommentGame.Params memory params = CommentGame.Params({
            id: gameIdCounter,
            initiator: msg.sender,
            gameToken: _gameToken,
            cost: _cost,
            gameTime: _time
        });

        CommentGame newGame = new CommentGame(params, feeCollector);

        deployedGames.push(address(newGame));

        emit GameCreated(
            newGame.id(),
            address(newGame),
            newGame.gameToken(),
            newGame.initiator(),
            newGame.gameTime(),
            newGame.endTime(),
            newGame.cost(),
            newGame.prizePool(),
            newGame.lastCommentor(),
            newGame.isEnded()
        );
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        feeCollector = _newCollector;
    }
}
