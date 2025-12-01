export function SquidCharacter() {
  return (
    <div className="icon-wrapper">
      <div className="squid-character">
        <div className="squid-body">
          <div className="squid-head">
            <div className="squid-fins">
              <div className="squid-fin left"></div>
              <div className="squid-fin right"></div>
            </div>
            <div className="squid-sunglasses">
              <div className="sunglasses-frame"></div>
              <div className="sunglasses-lens left-lens">
                <div className="lens-glare"></div>
              </div>
              <div className="sunglasses-lens right-lens">
                <div className="lens-glare"></div>
              </div>
            </div>
            <div className="squid-mouth"></div>
          </div>
          <div className="squid-tentacles">
            <div className="tentacle t1"></div>
            <div className="tentacle t2"></div>
            <div className="tentacle t3"></div>
            <div className="tentacle t4"></div>
            <div className="tentacle t5"></div>
          </div>
        </div>
      </div>
      <div className="icon-glow"></div>
    </div>
  );
}
