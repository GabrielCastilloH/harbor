import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ValidationChain, validationResult, body } from 'express-validator';

const validations: ValidationChain[] = [
  body('swiperId')
    .trim()
    .notEmpty()
    .withMessage('swiperId is required')
    .isString()
    .withMessage('swiperId must be a string'),
    
  body('swipedId')
    .trim()
    .notEmpty()
    .withMessage('swipedId is required')
    .isString()
    .withMessage('swipedId must be a string'),

  body('direction')
    .trim()
    .notEmpty()
    .withMessage('direction is required')
    .isIn(['left', 'right'])
    .withMessage('direction must be either left or right'),
];

const validateResults: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
    return;
  }
  next();
};

export const validateSwipe = [
  ...validations,
  validateResults,
] as RequestHandler[];