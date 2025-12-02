/**
 * 홈페이지 안내 컴포넌트
 */
export function HomePage() {
  return (
    <div
      className="comment-section"
      style={{ padding: "24px", textAlign: "center" }}
    >
      <h2
        style={{
          fontSize: "18px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: "#fff",
        }}
      >
        Comment Game
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "#aaa",
          marginBottom: "12px",
          lineHeight: "1.6",
        }}
      >
        Be the last to comment and win the prize pool!
      </p>
      <div
        style={{
          background: "rgba(139, 92, 246, 0.1)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          borderRadius: "12px",
          padding: "16px",
          marginTop: "16px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            color: "#8b5cf6",
            fontWeight: "500",
            marginBottom: "8px",
          }}
        >
          How to Play
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#888",
            lineHeight: "1.8",
          }}
        >
          1. Visit any creator's profile page
          <br />
          2. Start or join a Comment Game with their token
          <br />
          3. Be the last commenter when time runs out to win!
        </p>
      </div>
    </div>
  );
}
