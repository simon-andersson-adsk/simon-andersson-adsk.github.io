export const loadImage = async (blob) => {
  const img = new Image()
  img.src = URL.createObjectURL(blob)
  return await new Promise((res) =>img.onload = () => res(img))
}


export const pngBlobToImageData = async (blob) => {
  const img = new Image()
  img.src = URL.createObjectURL(blob)
  const loadedImage = await loadImage(blob)
  const canvas = document.createElement("canvas");
  canvas.width = loadedImage.width
  canvas.height = loadedImage.height
  const ctx = canvas.getContext("2d");
  ctx.drawImage(loadedImage, 0, 0);
  return ctx.getImageData(0, 0, loadedImage.width, loadedImage.height);
}

function polygonArea(coords) {
  let sum = 0
  for (let i = 0; i < coords.length - 1; i++) {
    sum += coords[i][0] * coords[i + 1][1] - coords[i][1] * coords[i + 1][0]
  }
  return Math.abs(sum / 2)
}

export const getFeatureCollectionArea = (featureCollection) => featureCollection.features.reduce((acc, feature) => acc + feature.geometry.coordinates.reduce((acc, coords) => acc + polygonArea(coords), 0),0)

export function downloadBlob(blob, filename = "download") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export const b64toBlob = (base64Blob, sliceSize=512) => {
  const contentType = base64Blob.substring(base64Blob.indexOf(":") + 1, base64Blob.indexOf(";"))
  const b64Data = base64Blob.substring(base64Blob.indexOf(",") + 1)
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
}
