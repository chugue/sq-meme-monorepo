/**
 * 댓글 생성 테스트 스크립트
 * - MockERC20 토큰을 사용하여 게임 생성 → 댓글 작성까지 테스트
 * - 백엔드가 CommentAdded 이벤트를 감지하여 DB에 저장하는지 확인
 */
import hre from "hardhat";
import { defineChain, createWalletClient, createPublicClient, http, parseEther, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

// 환경변수에서 주소 가져오기
const FACTORY_ADDRESS = (process.env.GAME_FACTORY_ADDRESS || "0x203b76f941d6ff95da8abd803329d39d7633773e") as `0x${string}`;
const TOKEN_ADDRESS = (process.env.MOCK_ERC20_ADDRESS || "0xfda7278df9b004e05dbaa367fc2246a4a46271c9") as `0x${string}`;

// ABI 정의
const factoryABI = [
  {
    inputs: [{ name: "", type: "address" }],
    name: "gameByToken",
    outputs: [
      { name: "gameAddress", type: "address" },
      { name: "tokenSymbol", type: "string" },
      { name: "tokenName", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "gameToken", type: "address" },
      { name: "_gameTime", type: "uint256" },
      { name: "_cost", type: "uint256" },
    ],
    name: "createGame",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "gameId", type: "uint256" },
      { indexed: true, name: "gameAddr", type: "address" },
      { indexed: true, name: "gameTokenAddr", type: "address" },
      { indexed: false, name: "tokenSymbol", type: "string" },
      { indexed: false, name: "tokenName", type: "string" },
      { indexed: false, name: "initiator", type: "address" },
      { indexed: false, name: "gameTime", type: "uint256" },
      { indexed: false, name: "endTime", type: "uint256" },
      { indexed: false, name: "cost", type: "uint256" },
      { indexed: false, name: "prizePool", type: "uint256" },
      { indexed: false, name: "lastCommentor", type: "address" },
      { indexed: false, name: "isEnded", type: "bool" },
    ],
    name: "GameCreated",
    type: "event",
  },
] as const;

const tokenABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const gameABI = [
  {
    inputs: [{ name: "_message", type: "string" }],
    name: "addComment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cost",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastCommentor",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "commentor", type: "address" },
      { indexed: false, name: "message", type: "string" },
      { indexed: false, name: "newEndTime", type: "uint256" },
      { indexed: false, name: "prizePool", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "CommentAdded",
    type: "event",
  },
] as const;

async function main() {
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not found in environment");
  }
  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}`;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: insectarium,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: insectarium,
    transport: http(),
  });

  console.log("=== 댓글 생성 테스트 시작 ===");
  console.log("Account:", account.address);
  console.log("Factory:", FACTORY_ADDRESS);
  console.log("Token:", TOKEN_ADDRESS);

  // 1. Factory에서 기존 게임 확인 (gameByToken은 튜플 반환: [gameAddress, tokenSymbol, tokenName])
  console.log("\n1. 기존 게임 확인 중...");
  const gameInfo = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryABI,
    functionName: "gameByToken",
    args: [TOKEN_ADDRESS],
  });

  // gameInfo는 [gameAddress, tokenSymbol, tokenName] 튜플
  let gameAddress = gameInfo[0] as `0x${string}`;
  console.log("gameByToken result:", gameInfo);
  console.log("gameAddress:", gameAddress);

  // 2. 게임이 없으면 생성
  if (gameAddress === "0x0000000000000000000000000000000000000000") {
    console.log("\n2. 게임이 없음 - 새 게임 생성 중...");

    // 먼저 approve
    const cost = parseEther("100"); // 100 토큰
    console.log("토큰 approve 중...");

    const approveHash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: tokenABI,
      functionName: "approve",
      args: [FACTORY_ADDRESS, cost],
      gas: 100000n,
    });
    console.log("Approve tx:", approveHash);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // 게임 생성
    console.log("게임 생성 중...");
    const gameTime = 3600n; // 1시간

    const createHash = await walletClient.writeContract({
      address: FACTORY_ADDRESS,
      abi: factoryABI,
      functionName: "createGame",
      args: [TOKEN_ADDRESS, gameTime, cost],
      gas: 5000000n,
    });
    console.log("CreateGame tx:", createHash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
    console.log("Transaction receipt:", receipt.status);

    // 이벤트에서 게임 주소 추출
    const logs = await publicClient.getContractEvents({
      address: FACTORY_ADDRESS,
      abi: factoryABI,
      eventName: "GameCreated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (logs.length > 0) {
      gameAddress = logs[0].args.gameAddr as `0x${string}`;
      console.log("게임 생성됨:", gameAddress);
    } else {
      // 이벤트가 없으면 다시 조회
      const newGameInfo = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: factoryABI,
        functionName: "gameByToken",
        args: [TOKEN_ADDRESS],
      });
      gameAddress = newGameInfo[0] as `0x${string}`;
      console.log("gameByToken으로 조회한 게임 주소:", gameAddress);
    }
  } else {
    console.log("기존 게임 발견:", gameAddress);
  }

  if (gameAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("게임 주소를 얻지 못했습니다.");
  }

  // 3. 댓글 작성
  console.log("\n3. 댓글 작성 테스트...");

  // 게임 cost 확인
  const gameCost = await publicClient.readContract({
    address: gameAddress,
    abi: gameABI,
    functionName: "cost",
  });
  console.log("게임 cost:", gameCost.toString());

  // 토큰 잔액 확인
  const balance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log("토큰 잔액:", balance.toString());

  // 게임에 approve
  console.log("게임 컨트랙트에 토큰 approve 중...");
  const gameApproveHash = await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: "approve",
    args: [gameAddress, gameCost * 10n], // 여러 댓글 작성 가능하도록 넉넉히
    gas: 100000n,
  });
  console.log("Game approve tx:", gameApproveHash);
  await publicClient.waitForTransactionReceipt({ hash: gameApproveHash });

  // 댓글 작성
  const testMessage = `테스트 댓글 - ${new Date().toISOString()}`;
  console.log("댓글 작성 중:", testMessage);

  const commentHash = await walletClient.writeContract({
    address: gameAddress,
    abi: gameABI,
    functionName: "addComment",
    args: [testMessage],
    gas: 500000n,
  });
  console.log("AddComment tx:", commentHash);

  const commentReceipt = await publicClient.waitForTransactionReceipt({ hash: commentHash });
  console.log("댓글 트랜잭션 상태:", commentReceipt.status);

  // CommentAdded 이벤트 확인
  const commentLogs = await publicClient.getContractEvents({
    address: gameAddress,
    abi: gameABI,
    eventName: "CommentAdded",
    fromBlock: commentReceipt.blockNumber,
    toBlock: commentReceipt.blockNumber,
  });

  if (commentLogs.length > 0) {
    console.log("\n=== CommentAdded 이벤트 발생! ===");
    console.log("commentor:", commentLogs[0].args.commentor);
    console.log("message:", commentLogs[0].args.message);
    console.log("newEndTime:", commentLogs[0].args.newEndTime?.toString());
    console.log("prizePool:", commentLogs[0].args.prizePool?.toString());
    console.log("timestamp:", commentLogs[0].args.timestamp?.toString());
  } else {
    console.log("CommentAdded 이벤트가 발생하지 않았습니다.");
  }

  // lastCommentor 확인
  const lastCommentor = await publicClient.readContract({
    address: gameAddress,
    abi: gameABI,
    functionName: "lastCommentor",
  });
  console.log("\nlastCommentor:", lastCommentor);

  console.log("\n=== 테스트 완료 ===");
  console.log("백엔드에서 CommentAdded 이벤트를 수신하여 DB에 저장했는지 확인하세요.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
