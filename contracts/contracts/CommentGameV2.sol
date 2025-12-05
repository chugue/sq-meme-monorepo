// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CommentGameV2 is ReentrancyGuard, Ownable {
    // 플랫폼 수수료
    uint256 public constant PLATFORM_FEE = 2;
    address public feeCollector;
    
    // 게임 ID 카운터
    uint256 public gameIdCounter;

    // 게임별 댓글 ID 카운터
    mapping(uint256 => uint256) public commentIdCounter;

    // 게임 데이터 구조체
    struct GameData {
        uint256 id;
        address initiator;
        address gameToken;
        uint256 cost;
        uint256 gameTime;
        string tokenSymbol;
        uint256 endTime;
        address lastCommentor;
        uint256 prizePool; // 펀딩된 상금 풀
        bool isClaimed;
        
        // 펀딩 관련
        mapping(address => uint256) fundings;  // 펀딩자별 펀딩 금액
        address[] funders;                    // 펀딩자 목록
        uint256 totalFunding;                 // 총 펀딩 금액
    }
    
    // 게임 ID -> 게임 데이터 맵핑
    mapping(uint256 => GameData) public games;
    
    // 토큰 주소 -> 현재 활성 게임 ID 맵핑
    mapping(address => uint256) public activeGameByToken;
    
    // 모든 게임 ID 목록
    uint256[] public allGameIds;
    
    struct GameInfo {
        uint256 id;
        address initiator;
        address gameToken;
        uint256 cost;
        uint256 gameTime;
        string tokenSymbol;
        uint256 endTime;
        address lastCommentor;
        uint256 prizePool;
        bool isClaimed;
        bool isEnded;
        uint256 totalFunding;
        uint256 funderCount;
    }

    event GameCreated(
        uint256 indexed gameId,
        address indexed initiator,
        address indexed gameToken,
        uint256 cost,
        uint256 gameTime,
        string tokenSymbol,
        uint256 endTime,
        address lastCommentor,
        uint256 totalFunding
    );

    event CommentAdded(
        uint256 indexed gameId,
        uint256 indexed commentId,
        address indexed commentor,
        string message,
        uint256 newEndTime,
        uint256 totalFunding,
        uint256 timestamp
    );

    event PrizePoolFunded(
        uint256 indexed gameId,
        address indexed funder,
        uint256 amount,
        uint256 totalFunding
    );

    event CommentFeeDistributed(
        uint256 indexed gameId,
        address indexed funder,
        uint256 amount
    );

    event PrizeClaimed(
        uint256 indexed gameId,
        address indexed winner,
        uint256 prizeAmount,
        uint256 timestamp
    );

    constructor(address _feeCollector) Ownable(msg.sender) {
        feeCollector = _feeCollector;
    }

    /**
     * @notice 게임을 생성하고 초기 펀딩을 받습니다.
     * @param _gameToken 게임 토큰 주소
     * @param _time 게임 시간 (초)
     * @param _cost 댓글 작성 비용
     * @param _initialFunding 초기 펀딩 금액
     * @return gameId 생성된 게임 ID
     */
    function createGame(
        address _gameToken,
        uint256 _time,
        uint256 _cost,
        uint256 _initialFunding
    ) external nonReentrant returns (uint256) {
        // 기존 활성 게임 확인
        uint256 existingGameId = activeGameByToken[_gameToken];
        if (existingGameId > 0) {
            GameData storage existingGame = games[existingGameId];
            require(
                block.timestamp >= existingGame.endTime,
                "Active game already exists for this token"
            );
        }
        
        gameIdCounter++;
        uint256 gameId = gameIdCounter;
        
        GameData storage game = games[gameId];
        game.id = gameId;
        game.initiator = msg.sender;
        game.gameToken = _gameToken;
        game.cost = _cost;
        game.gameTime = _time;
        game.tokenSymbol = IERC20Metadata(_gameToken).symbol();
        game.endTime = block.timestamp + _time;
        game.lastCommentor = msg.sender;
        
        // 초기 펀딩 처리
        if (_initialFunding > 0) {
            require(
                IERC20(_gameToken).transferFrom(
                    msg.sender,
                    address(this),
                    _initialFunding
                ),
                "Initial funding transfer failed"
            );
            
            game.fundings[msg.sender] = _initialFunding;
            game.funders.push(msg.sender);
            game.totalFunding = _initialFunding;
            game.prizePool = _initialFunding;
        }
        
        activeGameByToken[_gameToken] = gameId;
        allGameIds.push(gameId);
        
        emit GameCreated(
            gameId,
            msg.sender,
            _gameToken,
            game.cost,
            game.gameTime,
            game.tokenSymbol,
            game.endTime,
            game.lastCommentor,
            game.totalFunding
        );
        
        return gameId;
    }

    /**
     * @notice 상금 풀에 추가 펀딩합니다.
     * @param _gameId 게임 ID
     * @param _amount 펀딩할 금액
     */
    function fundPrizePool(uint256 _gameId, uint256 _amount) external nonReentrant {
        GameData storage game = games[_gameId];
        require(game.id > 0, "Game does not exist");
        require(block.timestamp < game.endTime, "Game already ended");
        require(_amount > 0, "Amount must be greater than 0");
        
        // 토큰 전송
        require(
            IERC20(game.gameToken).transferFrom(msg.sender, address(this), _amount),
            "Funding transfer failed"
        );
        
        // 펀딩자 정보 업데이트
        if (game.fundings[msg.sender] == 0) {
            game.funders.push(msg.sender);
        }
        game.fundings[msg.sender] += _amount;
        game.totalFunding += _amount;
        game.prizePool += _amount;
        
        emit PrizePoolFunded(_gameId, msg.sender, _amount, game.totalFunding);
    }

    /**
     * @notice 댓글 작성 시 지불된 토큰을 펀딩자들에게 분배합니다.
     * @param _gameId 게임 ID
     * @param _amount 분배할 금액
     */
    function _distributeCommentFee(uint256 _gameId, uint256 _amount) internal {
        GameData storage game = games[_gameId];
        require(game.totalFunding > 0, "No funders to distribute");
        
        // 플랫폼 수수료 계산 (2%)
        uint256 platformShare = (_amount * PLATFORM_FEE) / 100;
        uint256 distributableAmount = _amount - platformShare;
        
        // 플랫폼 수수료 전송
        if (platformShare > 0) {
            IERC20(game.gameToken).transfer(feeCollector, platformShare);
        }
        
        // 펀딩자들에게 분배
        uint256 distributed = 0;
        for (uint256 i = 0; i < game.funders.length; i++) {
            address funder = game.funders[i];
            uint256 share = (game.fundings[funder] * distributableAmount) / game.totalFunding;
            
            if (share > 0) {
                IERC20(game.gameToken).transfer(funder, share);
                distributed += share;
                emit CommentFeeDistributed(_gameId, funder, share);
            }
        }
        
        // 반올림 오류 보정: 마지막 펀딩자가 나머지 금액 처리
        uint256 remainder = distributableAmount - distributed;
        if (remainder > 0 && game.funders.length > 0) {
            address lastFunder = game.funders[game.funders.length - 1];
            IERC20(game.gameToken).transfer(lastFunder, remainder);
            emit CommentFeeDistributed(_gameId, lastFunder, remainder);
        }
    }

    /**
     * @notice 게임에 댓글을 등록하고 참가비를 지불합니다.
     * @param _gameId 게임 ID
     * @param _message 등록할 댓글 내용
     */
    function addComment(uint256 _gameId, string memory _message) external nonReentrant {
        GameData storage game = games[_gameId];
        require(game.id > 0, "Game does not exist");
        require(block.timestamp < game.endTime, "Game already ended");
        require(game.totalFunding > 0, "No funders available");
        
        // 토큰 승인 여부 확인
        uint256 allowance = IERC20(game.gameToken).allowance(
            msg.sender,
            address(this)
        );
        require(allowance >= game.cost, "ERC20: Must approve token first");
        
        // 참가비 결제
        IERC20(game.gameToken).transferFrom(msg.sender, address(this), game.cost);
        
        // 즉시 펀딩자들에게 분배
        _distributeCommentFee(_gameId, game.cost);
        
        // 댓글 ID 증가
        commentIdCounter[_gameId]++;
        uint256 commentId = commentIdCounter[_gameId];

        // 상태 업데이트
        game.lastCommentor = msg.sender;
        game.endTime = block.timestamp + game.gameTime;

        emit CommentAdded(_gameId, commentId, msg.sender, _message, game.endTime, game.totalFunding, block.timestamp);
    }

    /**
     * @notice 게임 종료 후 우승자가 펀딩된 상금 풀을 수령합니다.
     * @param _gameId 게임 ID
     */
    function claimPrize(uint256 _gameId) external nonReentrant {
        GameData storage game = games[_gameId];
        require(game.id > 0, "Game does not exist");
        require(block.timestamp >= game.endTime, "Game not ended yet");
        require(msg.sender == game.lastCommentor, "Only winner can withdraw");
        require(!game.isClaimed, "Prize already claimed");
        require(game.prizePool > 0, "No prize to claim");
        
        // 상태 변경
        game.isClaimed = true;
        uint256 prizeAmount = game.prizePool;
        game.prizePool = 0;
        
        // 상금 송금
        IERC20(game.gameToken).transfer(msg.sender, prizeAmount);
        
        emit PrizeClaimed(_gameId, msg.sender, prizeAmount, block.timestamp);
    }

    /**
     * @notice 게임 종료 여부를 확인합니다.
     * @param _gameId 게임 ID
     * @return 게임이 종료되었으면 true, 아니면 false
     */
    function isEnded(uint256 _gameId) external view returns (bool) {
        GameData storage game = games[_gameId];
        require(game.id > 0, "Game does not exist");
        return block.timestamp >= game.endTime;
    }

    /**
     * @notice 특정 게임의 펀딩자 목록을 반환합니다.
     * @param _gameId 게임 ID
     * @return 펀딩자 주소 배열
     */
    function getFunders(uint256 _gameId) external view returns (address[] memory) {
        GameData storage game = games[_gameId];
        require(game.id > 0, "Game does not exist");
        return game.funders;
    }

    /**
     * @notice 특정 게임의 전체 정보를 반환합니다.
     * @param _gameId 게임 ID
     * @return 게임 정보 구조체
     */
    function getGameInfo(uint256 _gameId) external view returns (GameInfo memory) {
        GameData storage game = games[_gameId];
        require(game.id > 0, "Game does not exist");
        
        return GameInfo({
            id: game.id,
            initiator: game.initiator,
            gameToken: game.gameToken,
            cost: game.cost,
            gameTime: game.gameTime,
            tokenSymbol: game.tokenSymbol,
            endTime: game.endTime,
            lastCommentor: game.lastCommentor,
            prizePool: game.prizePool,
            isClaimed: game.isClaimed,
            isEnded: block.timestamp >= game.endTime,
            totalFunding: game.totalFunding,
            funderCount: game.funders.length
        });
    }

    /**
     * @notice 토큰 주소로 활성 게임 ID를 조회합니다.
     * @param _token 토큰 주소
     * @return 활성 게임 ID (없으면 0)
     */
    function getActiveGameId(address _token) external view returns (uint256) {
        return activeGameByToken[_token];
    }

    /**
     * @notice 모든 게임 ID 목록을 반환합니다.
     * @return 모든 게임 ID 배열
     */
    function getAllGameIds() external view returns (uint256[] memory) {
        return allGameIds;
    }

    /**
     * @notice 모든 게임의 정보를 반환합니다.
     * @return 모든 게임 정보 배열
     */
    function getAllGames() external view returns (GameInfo[] memory) {
        GameInfo[] memory allGames = new GameInfo[](allGameIds.length);
        
        for (uint256 i = 0; i < allGameIds.length; i++) {
            uint256 gameId = allGameIds[i];
            GameData storage game = games[gameId];
            
            allGames[i] = GameInfo({
                id: game.id,
                initiator: game.initiator,
                gameToken: game.gameToken,
                cost: game.cost,
                gameTime: game.gameTime,
                tokenSymbol: game.tokenSymbol,
                endTime: game.endTime,
                lastCommentor: game.lastCommentor,
                prizePool: game.prizePool,
                isClaimed: game.isClaimed,
                isEnded: block.timestamp >= game.endTime,
                totalFunding: game.totalFunding,
                funderCount: game.funders.length
            });
        }
        
        return allGames;
    }

    /**
     * @notice feeCollector를 변경합니다.
     * @param _newCollector 새로운 feeCollector 주소
     */
    function setFeeCollector(address _newCollector) external onlyOwner {
        feeCollector = _newCollector;
    }
}
