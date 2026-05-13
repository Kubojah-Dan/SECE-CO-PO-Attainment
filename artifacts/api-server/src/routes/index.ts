import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import regulationsRouter from "./regulations";
import subjectsRouter from "./subjects";
import outcomesRouter from "./outcomes";
import mappingsRouter from "./mappings";
import studentsRouter from "./students";
import marksRouter from "./marks";
import uploadsRouter from "./uploads";
import attainmentRouter from "./attainment";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(regulationsRouter);
router.use(subjectsRouter);
router.use(outcomesRouter);
router.use(mappingsRouter);
router.use(studentsRouter);
router.use(marksRouter);
router.use(uploadsRouter);
router.use(attainmentRouter);
router.use(reportsRouter);
router.use(dashboardRouter);

export default router;
