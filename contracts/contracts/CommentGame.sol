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
    uint256 public immutable gameTime;
    uint256 public endTime;
    address public lastCommentor;
    uint256 public prizePool;
    bool public isEnded;
    // 플랫폼 수수료
    uint256 public constant PLATFORM_FEE = 2;
    address public immutable feeCollector;

    struct Params {
        uint256 id;
        address initiator;
        address gameToken;
        uint256 cost;
        uint256 gameTime;
    }

    event CommentAdded(
        address indexed commentor,
        string message,
        uint256 newEndTime,
        uint256 prizePool,
        uint256 timestamp
    );

    constructor(Params memory _params, address _feeCollector, uint256 _initialPrize) {
        id = _params.id;
        initiator = _params.initiator;
        gameToken = _params.gameToken;
        cost = _params.cost;
        gameTime = _params.gameTime;
        endTime = block.timestamp + _params.gameTime;
        lastCommentor = _params.initiator;
        feeCollector = _feeCollector;
        prizePool = _initialPrize;
    }

    /**
     * @notice 게임에 댓글을 등록하고 참가비를 지불합니다.
     * @dev 호출 전에 반드시 ERC20 approv가 선행되어야 합니다.
     * @param _message 등록할 댓글 내용
     */
    function addComment(string memory _message) external nonReentrant {
        // 1. 게임 종료 여부 확인 (시간 체크)
        require(block.timestamp < endTime, "Game already ended");

        // 2. 게임 종료 여부 확인 (변수 체크)
        require(!isEnded, "Game already ended");

        // 3. 토큰 승인 여부 확인
        uint256 allowance = IERC20(gameToken).allowance(
            msg.sender,
            address(this)
        );
        require(allowance >= cost, "ERC20: Must approve token first");

        // 4. 참가비 결제 (User -> Game Contract)
        IERC20(gameToken).transferFrom(msg.sender, address(this), cost);

        // 5. 상태 업데이트
        lastCommentor = msg.sender;
        endTime = block.timestamp + gameTime;
        prizePool += cost;

        emit CommentAdded(msg.sender, _message, endTime, prizePool, block.timestamp);
    }

    /**
     * @notice 게임 종료 후 우승자가 상금을 수령합니다.
     * @dev Checks-Effects-Interactions 패턴을 준수하여 재진입 공격을 방지합니다.
     */
    function claimPrize() external nonReentrant {
        // 1. Checks (검증)
        require(block.timestamp >= endTime, "Game not ended yet");
        require(msg.sender == lastCommentor, "Only winner can withdraw");
        require(!isEnded, "Already withdrawn");

        // 2. Effects (상태 변경)
        isEnded = true;

        // 3. Interactions (상호작용 - 송금)
        uint256 totalPrize = prizePool;

        // 4. 수수료 계산 (2%)
        uint256 platformShare = (totalPrize * PLATFORM_FEE) / 100;
        uint256 winnerShare = totalPrize - platformShare;

        // 5. 플랫폼 수수료 송금
        if (platformShare > 0) {
            IERC20(gameToken).transfer(feeCollector, platformShare);
        }

        // 6. 우승 상금 송금
        if (winnerShare > 0) {
            IERC20(gameToken).transfer(msg.sender, winnerShare);
        }
    }
}
