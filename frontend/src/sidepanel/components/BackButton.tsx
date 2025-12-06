import { useSetAtom } from "jotai";
import { navigateBackAtom } from "../atoms/pageAtoms";

export default function BackButton() {
    const navigateBack = useSetAtom(navigateBackAtom);

    return (
        <img 
            src='/icon/back_icon.png' 
            className="w-8 h-8 cursor-pointer" 
            onClick={navigateBack}
            alt="Back"
        />
    );
}

