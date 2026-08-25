import { LOGO_IMAGE } from "../../constants/assets";

export default function LogoImage() {
  return (
    <div className="lg">
      <img className="lg-img" src={LOGO_IMAGE} alt="" />
    </div>
  );
}
