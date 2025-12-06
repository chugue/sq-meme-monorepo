import homeBg from "../../../assets/home.png";
import homeFloor from "../../../assets/home_floor.png";

export default function DashboardBackground() {
    return (
        <div className="dashboard-background fixed inset-0 w-full h-full">
            <img src={homeBg} alt="Background" className="bg-image w-full h-full object-cover" />
            <img
                src={homeFloor}
                alt="Floor"
                className="absolute bottom-0 left-0 right-0 w-full h-full z-0 transform duration-1000 translate-y-[20%] sm:translate-y-[50%]"
                style={{
                    animationDelay: '0.5s',
                }}
            />
        </div>
    );
}

