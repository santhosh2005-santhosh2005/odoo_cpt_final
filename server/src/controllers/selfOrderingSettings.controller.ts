
import { Request, Response } from "express";
import { SelfOrderingSettings } from "../models/SelfOrderingSettings";

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await SelfOrderingSettings.findOne();
    if (!settings) {
      settings = await SelfOrderingSettings.create({});
    }
    res.json({ data: settings });
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settings = await SelfOrderingSettings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });
    res.json({ data: settings });
  } catch (error) {
    res.status(500).json({ message: "Error updating settings" });
  }
};
