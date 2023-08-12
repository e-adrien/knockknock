import { Request, Response, Router } from "express";
import knockknock from "./knockknock";

const router = Router();

router.use("/knockknock", knockknock);
router.use((req: Request, res: Response): void => {
  // Check if it's an AJAX Request
  if (req.xhr === true) {
    // Send the Error Status
    res.status(404).json({}).end();
  } else {
    // Render the Error Page
    res.status(500).render("error", { code: 404 });
  }
});

export default router;
