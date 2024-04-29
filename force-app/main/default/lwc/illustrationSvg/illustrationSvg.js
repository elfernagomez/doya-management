import { LightningElement, api } from 'lwc';

import Empty from "./empty.html";
import GoingCamping from "./goingCamping.html";
import Maintenance from "./maintenance.html";
import Desert from "./desert.html";
import OpenRoad from "./openRoad.html";
import NoAccess from "./noAccess.html";
import NoConnection from "./noConnection.html";
import NotAvailableInLightning from "./notAvailableLightning.html";
import PageNotAvailable from "./pageNotAvailable.html";
import WalkthroughNotAvailable from "./walkthrough.html";
import FishingDeals from "./fishing.html";
import LakeMountain from "./lakeMountain.html";
import NoEvent from "./noEvent.html";
import NoTask from "./noTask.html";
import Setup from "./setup.html";
import GoFishing from "./goneFishing.html";
import NoAccess2 from "./noAccess2.html";
import NoContent from "./noContent.html";
import NoPreview from "./noPreview.html";
import Preview from "./preview.html";
import Research from "./research.html";

const variantMap = {
	"going-camping": GoingCamping,
	"maintenance": Maintenance,
	"desert": Desert,
	"open-road": OpenRoad,
	"no-access": NoAccess,
	"no-connection": NoConnection,
	"not-available-in-lightning": NotAvailableInLightning,
	"page-not-available": PageNotAvailable,
	"walkthrough-not-available": WalkthroughNotAvailable,
	"fishing-deals": FishingDeals,
	"lake-mountain": LakeMountain,
	"no-events": NoEvent,
	"no-task": NoTask,
	"setup": Setup,
	"gone-fishing": GoFishing,
	"no-access-2": NoAccess2,
	"no-content": NoContent,
	"no-preview": NoPreview,
	"preview": Preview,
	"research": Research
};

export default class IllustrationSvg extends LightningElement {
	@api
	variant;

	render() {
		console.log(this.variant);
		if (!variantMap[this.variant])
			console.warn(
				`Image for variant "${
					this.variant}" not found. Supported variants: ${
					Object.keys(variantMap)}`
			);
		console.log(variantMap[this.variant])
		return variantMap[this.variant] || Empty;
	}
}