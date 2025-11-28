// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CommentGame.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameFactory is Ownable {
    uint256 public gameIdCounter;
    address[] public deployedGames;
    address public feeCollector;

    event GameCreated(
        address indexed gameAddr,
        address indexed gameTokenAddr,
        address initiator,
        uint256 timer,
        uint256 cost
    );

    constructor(address _feeCollector) Ownable(msg.sender) {
        feeCollector = _feeCollector;
    }

    function createGame(
        address _gameToken,
        uint256 _timer,
        uint _cost
    ) external {
        gameIdCounter++;

        CommentGame.Params memory params = CommentGame.Params({
            id: gameIdCounter,
            initiator: msg.sender,
            gameToken: _gameToken,
            cost: _cost,
            timer: _timer
        });

        CommentGame newGame = new CommentGame(params, feeCollector);

        deployedGames.push(address(newGame));

        emit GameCreated(
            address(newGame),
            _gameToken,
            msg.sender,
            _timer,
            _cost
        );
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        feeCollector = _newCollector;
    }
}
