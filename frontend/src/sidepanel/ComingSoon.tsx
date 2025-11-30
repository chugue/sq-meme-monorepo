import { useEffect, useState } from 'react';
import './ComingSoon.css';

export function ComingSoon() {
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

    useEffect(() => {
        // Generate random particles
        const newParticles = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 2,
        }));
        setParticles(newParticles);
    }, []);

    return (
        <div className="coming-soon-container">
            <div className="particles-layer">
                {particles.map((particle) => (
                    <div
                        key={particle.id}
                        className="particle"
                        style={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            animationDelay: `${particle.delay}s`,
                        }}
                    />
                ))}
            </div>
            <div className="glow-overlay"></div>
            <div className="coming-soon-content">
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
                <div className="title-wrapper">
                    <h1 className="coming-soon-title">
                        <span className="title-char" style={{ animationDelay: '0s' }}>C</span>
                        <span className="title-char" style={{ animationDelay: '0.1s' }}>O</span>
                        <span className="title-char" style={{ animationDelay: '0.2s' }}>M</span>
                        <span className="title-char" style={{ animationDelay: '0.3s' }}>I</span>
                        <span className="title-char" style={{ animationDelay: '0.4s' }}>N</span>
                        <span className="title-char" style={{ animationDelay: '0.5s' }}>G</span>
                    </h1>
                    <h1 className="coming-soon-title coming-soon-title-second">
                        <span className="title-char" style={{ animationDelay: '0.6s' }}>S</span>
                        <span className="title-char" style={{ animationDelay: '0.7s' }}>O</span>
                        <span className="title-char" style={{ animationDelay: '0.8s' }}>O</span>
                        <span className="title-char" style={{ animationDelay: '0.9s' }}>N</span>
                    </h1>
                </div>
                <div className="marketing-text-wrapper">
                    <p className="marketing-text">BUCKLE UP, SHIT'S ABOUT TO GET REAL</p>
                </div>
                <div className="neon-bar-container">
                    <div className="neon-bar"></div>
                </div>
            </div>
        </div>
    );
}

