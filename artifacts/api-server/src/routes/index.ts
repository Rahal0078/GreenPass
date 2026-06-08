import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import placesRouter from "./places";
import complaintsRouter from "./complaints";
import techniciansRouter from "./technicians";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import mediaRouter from "./media";
import customersRouter from "./customers";
import pushRouter from "./push";
import projectsRouter from "./projects";
import quotationRouter from "./quotation";
import closureRouter from "./closure";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(placesRouter);
router.use(complaintsRouter);
router.use(techniciansRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(mediaRouter);
router.use(customersRouter);
router.use(pushRouter);
router.use(projectsRouter);
router.use(quotationRouter);
router.use(closureRouter);

export default router;
