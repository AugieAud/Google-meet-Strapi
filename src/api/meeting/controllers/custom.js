//custom Strapi controller for handling the creation of a meeting entry in the database.

import { factories } from "@strapi/strapi"; //strapi utility to create a controller for an api

export default factories.createCoreController(
  "api::meeting.meeting", //defining a custom controller for the meeting
  ({ strapi }) => ({
    async create(ctx) {
      try {
        const {
          title,
          startTime,
          endTime,
          participantEmails = [],
        } = ctx.request.body.data;
        const user = ctx.state.user;

        console.log("came here");

        if (!user) {
          return ctx.unauthorized("You must be logged in to create a meeting");
        }

        // Validate required fields
        if (!startTime || !endTime) {
          return ctx.badRequest("Start time and end time are required");
        }

        // Validate time logic
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
          return ctx.badRequest("End time must be after start time");
        }

        if (start < new Date()) {
          return ctx.badRequest("Start time cannot be in the past");
        }

        // Find users by email
        const userIds = new Set([user.documentId]);
        const invalidEmails = [];

        if (participantEmails && participantEmails.length > 0) {
          const users = await strapi
            .query("plugin::users-permissions.user")
            .findMany({
              where: {
                email: {
                  $in: participantEmails,
                },
              },
              select: ["documentId", "email"],
            });

          // Track which emails were found
          const foundEmails = new Set(users.map((user) => user.email));

          // Add found user IDs to the set
          users.forEach((user) => userIds.add(user.documentId));

          // Track invalid emails
          invalidEmails.push(
            ...participantEmails.filter((email: any) => !foundEmails.has(email))
          );
        }
        // Create the meeting
        const meeting = await strapi.documents("api::meeting.meeting").create({
          data: {
            title,
            startTime,
            meetingId: title.toLowerCase().replace(/\s+/g, "-"),
            endTime,
            isActive: false,
            hosts: user.id,
            participants: {
              connect: Array.from(userIds),
            },
            publishedAt: new Date(),
          },
          status: "published",
          populate: ["hosts", "participants"],
        });

        // Return meeting data along with any invalid emails
        return {
          data: meeting,
          meta: {
            invalidEmails: invalidEmails.length > 0 ? invalidEmails : undefined,
          },
        };
      } catch (error) {
        console.error("Meeting creation error:", error);
        ctx.throw(
          500,
          error instanceof Error
            ? error.message
            : "An error occurred while creating the meeting"
        );
      }
    },
}