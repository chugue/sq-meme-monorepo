
interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAgree: () => void;
}

export function TermsModal({ isOpen, onClose, onAgree }: TermsModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center flex-1"
            onClick={onClose}
        >

            <div
                className="bg-black/70 border border-[#8411CA] flex flex-col p-3 sm:p-5 rounded-lg w-[80%] max-w-[400px]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-end gap-5 ">
                    <div className="flex flex-col items-center gap-2 ">
                        <div className="text-white  text-center py-3 text-[14px] text-shadow-[0_0_4.35px_#1F0E00]">
                            Agreement Required
                        </div>
                        <div className="text-white text-center text-[10.5px] uppercase font-pretendard">
                            I AGREE TO THE{" "}
                            <a
                                href="#"
                                className="text-blue-500 underline hover:text-blue-400"
                                onClick={(e) => e.preventDefault()}
                            >
                                TERMS OF SERVICE
                            </a>{" "}
                            AND{" "}
                            <a
                                href="#"
                                className="text-blue-500 underline hover:text-blue-400"
                                onClick={(e) => e.preventDefault()}
                            >
                                PRIVACY POLICY
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-2 justify-around w-full mt-5">
                        <button
                            className="flex flex-row justify-center items-center h-10 flex-1  bg-[#343852] rounded-lg text-white text-center text-sm  hover:opacity-90 transition-opacity"
                            onClick={onClose}
                        >
                            I Decline
                        </button>
                        <button
                            className="flex flex-row justify-center items-center h-10 flex-1  bg-[#8411CA] rounded-lg text-white text-center text-sm font-bold  hover:opacity-90 transition-opacity"
                            onClick={onAgree}
                        >
                            I Agree
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
