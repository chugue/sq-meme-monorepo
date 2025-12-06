import { useSetAtom } from "jotai";
import { navigateBackAtom } from "./atoms/pageAtoms";

export default function QuestPage() {
    const navigateBack = useSetAtom(navigateBackAtom);


    return (
        <div>
            <h1>Quest Page</h1>
            <button onClick={navigateBack}>Back to Dashboard</button>
        </div>
    );
}