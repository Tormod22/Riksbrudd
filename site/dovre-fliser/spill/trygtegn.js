// Trygg tegning (R17, funn 22 – brukeren på Windows: «Noe gikk galt … drawImage …» og svart kart etter at vinduet ble endret).
// drawImage kaster en feil når kilden er et lerret eller bilde med bredde eller høyde 0 (vinduet krymper, minimeres eller endres
// mens kartet eller 3D tegnes) eller et bilde som ikke kunne leses. Da tegnes ingenting i stedet, og kartet tegnes riktig i neste bilde.
// Lastes først på siden og i bakgrunnstråden (kartflis-arbeider.js). Reglene øverst virker uten DOM: TrygTegn.tom(kilde).
(function (rot) {
  // tom(kilde): sant når drawImage ville kastet fordi kilden ikke har noe å tegne
  function tom(b) {
    if (!b) return false;
    if (typeof HTMLImageElement !== 'undefined' && b instanceof HTMLImageElement) return b.complete && b.naturalWidth === 0;
    if (typeof HTMLVideoElement !== 'undefined' && b instanceof HTMLVideoElement) return false;
    const w = b.width, h = b.height;
    return typeof w === 'number' && typeof h === 'number' && (w === 0 || h === 0);
  }
  const T = { tom, hoppet: 0 };
  function pakk(proto) {
    if (!proto || !proto.drawImage || proto.drawImage.trygg) return;
    const ekte = proto.drawImage;
    const trygg = function (b) { if (tom(b)) { T.hoppet++; return; } return ekte.apply(this, arguments); };
    trygg.trygg = true; proto.drawImage = trygg;
  }
  if (typeof CanvasRenderingContext2D !== 'undefined') pakk(CanvasRenderingContext2D.prototype);
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') pakk(OffscreenCanvasRenderingContext2D.prototype);
  if (typeof module !== 'undefined' && module.exports) module.exports = T; else rot.TrygTegn = T;
})(typeof globalThis !== 'undefined' ? globalThis : this);
