import { useSetAtom } from "jotai";
import backIcon from "../../../assets/arrow_back.png";
import { navigateBackAtom } from "../atoms/pageAtoms";

export default function BackButton() {
    const navigateBack = useSetAtom(navigateBackAtom);

    return <img src={backIcon} className="w-8 h-13 cursor-pointer" onClick={navigateBack} alt="Back" />;
}
