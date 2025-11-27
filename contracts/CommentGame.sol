// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Phase1: 핵심 컨트렉트 설계
/**
 * 1. 데이터 구조 정의 - Game 상태를 저장할 struct설계
 * 2. GameFactory 컨트렉트 - createGame() 함수와 이벤트
 * 3. CommentGame 컨트렉트 - 개별 게임 로직 (댓글 작성, 타이머, 상금 분배)
 */

// Phase2: 핵심 기능 구현
/**
 * 4. 댓글 작성 로직 - 비용지불 + 타이머 리셋
 * 5. 게임 종료 로직 - 타이머 만료시 승자에게 상금
 * 6. 상금 풀 관리 - 수수료 구조
 */

// Phase3: 보안 및 테스트
/**
 * 7. 접근 제어 및 예외 처리
 * 8. 테스트 케이스 작성
 */

contract CommentGame is ReentrancyGuard {
    uint256 public immutable id;
    address public immutable initiator;
    address public immutable gameToken;
    uint256 public immutable cost;
    uint256 public timer;
    uint256 public endTime;
    address public lastCommentor;
    uint256 public accumulatedFees;
    bool public isEnded;
    // 플랫폼 수수료
    uint256 public constant PLATFORM_FEE = 2;
    address public immutable feeCollector;

    struct Params {
        uint256 id;
        address initiator;
        address gameToken;
        uint256 cost;
        uint256 timer;
    }

    constructor(Params memory _params, address _feeCollector) {
        id = _params.id;
        initiator = _params.initiator;
        gameToken = _params.gameToken;
        cost = _params.cost;
        timer = _params.timer;
        endTime = block.timestamp + _params.timer;
        lastCommentor = _params.initiator;
        feeCollector = _feeCollector;
    }
}
