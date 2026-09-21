import Lanyard from './Lanyard';

export default function PortfolioLanyard() {
  return (
    <div className="portfolio-lanyard">
      <Lanyard
        position={[0, 0, 27]}
        gravity={[0, -40, 0]}
        fov={20}
        transparent
        frontImage="/assets/lanyard/front-photo.jpg"
        backImage="/assets/lanyard/back-photo.svg"
        imageFit="cover"
        lanyardImage="/assets/lanyard/lanyard-pattern.svg"
        lanyardWidth={1.15}
      />
    </div>
  );
}
