import { getExtensionImageUrl } from "@/contents/utils/getExtensionImageUrl";
import { motion } from "framer-motion";

/**
 * 홈페이지 안내 컴포넌트
 */
export function HomePage() {
    return (
        <motion.img
            src={getExtensionImageUrl("icon/markeing.png")}
            alt="Wannabe Meme-illionaire"
            data-testid="squid-home-section"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.5 }}
            style={{
                width: "366px",
                height: "auto",
                objectFit: "contain",
                display: "block",
            }}
        />
    );
}
