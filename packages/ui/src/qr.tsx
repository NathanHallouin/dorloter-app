import { QRCodeSVG } from "qrcode.react";

/**
 * QR code (rendu SVG, net à l'impression). Enveloppe fine sur `qrcode.react`
 * pour centraliser la dépendance dans le design system. Consommé par les
 * documents imprimables (fiche cage refuge, affiche perdus/trouvés).
 */
export function QR({
  value,
  size = 128,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={0}
      bgColor="#ffffff"
      fgColor="#1a1712"
      className={className}
    />
  );
}
