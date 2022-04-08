import {useCallback} from "react";
import * as postRobot from "post-robot";
import {b64toBlob, downloadBlob, getFeatureCollectionArea, loadImage, pngBlobToImageData} from "./utils";
import {useRecoilCallback} from "recoil";

const whiteBarHeight = 380;
const spacemakerLogo = new Path2D(
  "M11.9985 4.47737C13.9181 4.55736 15.6778 5.43719 16.5896 6.78094L19.9969 3.88549C18.1733 1.51794 15.2139 0.0782147 11.9985 -0.00177002V4.47737ZM15.5489 17C15.3742 15.4038 13.4679 14.7934 11.2757 14.1049L11.2669 14.1021C8.07538 13.101 4.12697 11.8625 4 7H8.46389C8.62275 8.61189 10.529 9.20657 12.7372 9.89515C15.9302 10.8811 19.8857 12.1174 19.9969 17H15.5489ZM12.0011 24.0027C8.78468 23.9227 5.82426 22.4825 4 20.1142L7.40848 17.2178C8.32061 18.578 10.0809 19.4581 12.0011 19.5221V24.0027Z",
);
const months = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const printScreenAsBlob = async () => {
  const imageRes = await postRobot.send(window.parent, 'takePrintScreenOfScene')
  return b64toBlob(imageRes.data)
}

const greenishPixel = (rgba) => {
  const greenish = rgba[0] < 178 && rgba[1] > 180 && rgba[2] < 155
  if(greenish)
    return true

  return false
}

const countGreenishPixels = (imageData) => {
  let noGreenishPixels = 0
  for(let i=0; i < imageData.data.length; i+=4) {
    if(greenishPixel([imageData.data[i], imageData.data[i+1], imageData.data[i+2], imageData.data[i+3]]))
      noGreenishPixels++;
  }

  return noGreenishPixels
}

const addSunStudyInfoToCanvas = (
  image,
  hour,
  minute,
  date,
  outdoorArea,
  sunlitArea
) => {
  
  const width = image.width;
  const height = image.height + whiteBarHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx2d = canvas.getContext("2d");

  const drawVerticalLine = (x, y0, y1) => {
    ctx2d.beginPath();
    ctx2d.moveTo(x, y0);
    ctx2d.lineTo(x, y1);
    ctx2d.closePath();
    ctx2d.stroke();
  };

  const drawLines = (xPositions) => {
    xPositions.forEach(x => {
      drawVerticalLine(x, height - whiteBarHeight, height);
    });
  };

  const headerText = (text, xPosition) => {
    ctx2d.textAlign = "center";
    const yPositioningHeader = height - whiteBarHeight / 2;
    const fontHeader = "normal 600 100px Inter";
    ctx2d.font = fontHeader;
    ctx2d.fillText(text, xPosition, yPositioningHeader);
    ctx2d.textAlign = "start";
  };

  const subHeaderText = (text, xPosition) => {
    ctx2d.textAlign = "center";
    const yPositioningSubHeader = height - whiteBarHeight / 2 + 100;
    const fontSubHeader = "normal 500 64px Inter";
    ctx2d.font = fontSubHeader;
    ctx2d.fillText(text, xPosition, yPositioningSubHeader);
    ctx2d.textAlign = "start";
  };

  const titleText = () => {
    ctx2d.font = "54px Inter";
    ctx2d.fillText("Architectural", 0.1 * width, height - whiteBarHeight / 2 - 20);
    ctx2d.fillText("Sun Diagram", 0.1 * width, height - whiteBarHeight / 2 + 70);
  };

  const smLogo = () => {
    ctx2d.translate(0.035 * width, 0.9 * height);
    ctx2d.scale(5, 5);
    ctx2d.fill(spacemakerLogo);
  };

  ctx2d.fillStyle = "white";
  ctx2d.strokeStyle = "white";

  ctx2d.drawImage(image, 0, 0);
  ctx2d.fillRect(0, height - whiteBarHeight, width, whiteBarHeight);

  ctx2d.fillStyle = "black";
  ctx2d.strokeStyle = "black";

  drawLines([0.28 * width, 0.46 * width, 0.69 * width]);

  titleText();

  headerText(`${hour}`.padStart(2, "0") + ":" + `${minute}`.padStart(2, "0"), 0.37 * width);
  subHeaderText(`${date.day} ${months[date.month]}`, 0.37 * width);

  headerText(`${Math.round(outdoorArea)} m²`, 0.57 * width);
  subHeaderText("Outdoor area", 0.57 * width);

  headerText(`${Math.round(sunlitArea)} m²`, 0.78 * width);
  const percentageInSunlight = Math.round((sunlitArea / outdoorArea) * 100);
  headerText(`${percentageInSunlight} %`, 0.93 * width);

  subHeaderText("Sunlit outdoor area", width * 0.84);

  drawVerticalLine(0.87 * width, 0.89 * height, 0.93 * height);

  smLogo();

  return ctx2d.canvas;
};

const SunStudy = () => {
  const createSunStudy = useRecoilCallback(() => async () => {
    const asyncThings = async () => {
      const sunState = await postRobot.send(window.parent, 'getSunState')

      const siteConfigRes = await postRobot.send(window.parent, 'getSiteConfig')
      const siteConfig = siteConfigRes.data
      const outdoorArea = siteConfig.find(sc => sc.key === "outdoor_area").value
      const areaOfOutdoorArea = getFeatureCollectionArea(outdoorArea);

      await postRobot.send(window.parent, 'setVisibleLayers', ['outdoor_area'])
      await postRobot.send(window.parent, 'divisionLinesVisible', false)
      await postRobot.send(window.parent, 'zonesVisible', false)
      await postRobot.send(window.parent, 'functionsVisible', false)
      await postRobot.send(window.parent, 'shadowsVisible', false)

      await postRobot.send(window.parent, 'proposalBuildingsVisible', false)
      const buildLimitBlob = await printScreenAsBlob()

      await postRobot.send(window.parent, 'setVisibleLayers', ['existing_building_barriers', 'surrounding_building_barriers', 'outdoor_area', 'vegetation_barriers'])
      await postRobot.send(window.parent, 'proposalBuildingsVisible', true)

      const withoutShadowsBlob = await printScreenAsBlob()

      await postRobot.send(window.parent, 'shadowsVisible', true)

      const withShadowsBlob = await printScreenAsBlob()

      const buildLimit = await pngBlobToImageData(buildLimitBlob)
      const image = await loadImage(withShadowsBlob)
      const imageDataWithoutShadows = await pngBlobToImageData(withoutShadowsBlob)
      const imageDataWithShadows = await pngBlobToImageData(withShadowsBlob)

      const buildLimitGreenPixels = countGreenishPixels(buildLimit)
      const greenishPixelsWithoutShadows = countGreenishPixels(imageDataWithoutShadows)
      const greenishPixelsWithShadows = countGreenishPixels(imageDataWithShadows)

      console.log("buildLimitGreenPixels", buildLimitGreenPixels)
      console.log("greenishPixelsWithoutShadows", greenishPixelsWithoutShadows)
      console.log("greenishPixelsWithShadows", greenishPixelsWithShadows)

      const outdoorAreaSqm = areaOfOutdoorArea * greenishPixelsWithoutShadows/buildLimitGreenPixels
      const sunlitOutdoorArea = outdoorAreaSqm * greenishPixelsWithShadows/greenishPixelsWithoutShadows

      console.log("areaOfOutdoorArea", areaOfOutdoorArea)
      console.log("outdoorAreaSqm", outdoorAreaSqm)
      console.log("sunlitOutdoorArea", sunlitOutdoorArea)

      const time = sunState.data.positions.offsets[sunState.data.position]
      addSunStudyInfoToCanvas(image, time.hour, time.minute, sunState.data.positions.date, outdoorAreaSqm, sunlitOutdoorArea).toBlob(blob => {
        downloadBlob(blob, `Study.png`);
      })
    }
    asyncThings()
  }, [])
  
  return <button onClick={createSunStudy}>Create sun study</button>
}

export default SunStudy