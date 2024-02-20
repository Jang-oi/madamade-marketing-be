import licenseService from "../../service/license/licenseService.js";

export default {
    getLicense : async (req, res) => {
        res.send(await licenseService.licenseCheck(req.body));
    },
    setLicense : async (req, res) => {
        res.send(await licenseService.manualOpen(req.body));
    }
}