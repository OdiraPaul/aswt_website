const appointmentService = require("../services/appointment.services");
const userService = require("../services/user.services");
const freeTimeSlotService = require("../services/freeTimeSlot.services");
const {
  errorMessage,
  successMessage,
  jsonResponse,
} = require("../common/messages.common");
const { MESSAGES } = require("../common/constants.common");

class FreeTimeSlotController {
  async getStatus(req, res) {
    res.status(200).send({ message: MESSAGES.DEFAULT, success: true });
  }

  //Create a new appointment
  async createFreeTimeSlot(req, res) {
    const { staffId, startTime, endTime, description, customerEmail } =
      req.body;

    const [staff] = await userService.getUserByRoleAndId(staffId, "staff");

    if (!staff) return res.status(404).send(errorMessage("staff"));

    const appointment = await appointmentService.createFreeTimeSlot({
      staffId,
      customerEmail,
      endTime,
      startTime,
      description,
    });

    res.send(successMessage(MESSAGES.CREATED, appointment));
  }

  getFreeTimeSlots = async (req, res) => {
    let { date } = req.body;
    const { formattedDate } = freeTimeSlotService.getFormattedDate(date);

    date = formattedDate;

    const availableTimeSlots = await this.generateFreeTimeSlots({
      res,
      date,
    });
    if (availableTimeSlots.statusCode) return;

    res.send(successMessage(MESSAGES.FETCHED, availableTimeSlots));
  };

  async generateFreeTimeSlots({ date, res }) {
    let staffIds = await userService.fetchIdsOfStaffsWhoCanTakeAppointments();

    if (staffIds.length > 0) {
      staffIds = staffIds.map((staffId) => staffId.toString());
    } else {
      return jsonResponse(
        res,
        404,
        false,
        "No staff is available to take apointments"
      );
    }

    let freeTimeSlots = await freeTimeSlotService.fetchFreeTimeSlotsByDate({
      date,
    });

    if (freeTimeSlots.length < 1) {
      const timeSlotDocuments = freeTimeSlotService.getTimeSlotDocuments({
        staffIds,
        date,
      });

      await freeTimeSlotService.addSlotsForStaff({
        timeSlotDocuments,
      });

      freeTimeSlots = await freeTimeSlotService.fetchFreeTimeSlotsByDate({
        date,
      });
    }

    const staffIdsWithoutFreeTimeSlot =
      await freeTimeSlotService.getStaffIdsWithoutFreeTimeSlot({
        staffIds,
        date,
      });

    if (staffIdsWithoutFreeTimeSlot.length > 0) {
      const timeSlotDocuments = freeTimeSlotService.getTimeSlotDocuments({
        staffIdsWithoutFreeTimeSlot,
        date,
      });

      await freeTimeSlotService.addSlotsForStaff({
        timeSlotDocuments,
      });

      freeTimeSlots = await freeTimeSlotService.fetchFreeTimeSlotsByDate({
        date,
      });
    }

    const uniqueTimeSlots = [
      ...new Set(freeTimeSlots.flatMap((item) => item.timeSlots)),
    ];

    return uniqueTimeSlots;
  }

  //get appointment from the database, using their email
  async getFreeTimeSlotById(req, res) {
    const appointment = await appointmentService.getFreeTimeSlotById(
      req.params.id
    );
    if (!appointment) return res.status(404).send(errorMessage("appointment"));

    res.send(successMessage(MESSAGES.FETCHED, appointment));
  }

  async getFreeTimeSlotByEntryIdAndStaffId(req, res) {
    const { entryId, staffId } = req.body;

    const appointment =
      await appointmentService.getFreeTimeSlotByEntryIdAndStaffId(
        entryId,
        staffId
      );
    if (!appointment) return res.status(404).send(errorMessage("appointment"));

    res.send(successMessage(MESSAGES.FETCHED, appointment));
  }

  //get all entries in the appointment collection/table
  async fetchAllFreeTimeSlots(req, res) {
    const entries = await appointmentService.getAllFreeTimeSlots();

    res.send(successMessage(MESSAGES.FETCHED, entries));
  }

  //Update/edit appointment data
  async updateFreeTimeSlot(req, res) {
    const appointment = await appointmentService.getFreeTimeSlotById(
      req.params.id
    );
    if (!appointment) return res.status(404).send(errorMessage("appointment"));

    let updatedFreeTimeSlot = req.body;
    updatedFreeTimeSlot = await appointmentService.updateFreeTimeSlotById(
      req.params.id,
      updatedFreeTimeSlot
    );

    res.send(successMessage(MESSAGES.UPDATED, updatedFreeTimeSlot));
  }

  async clearOutAppointment(req, res) {
    const { date } = req.body;

    let freeTimeSlots = await freeTimeSlotService.fetchFreeTimeSlotsByDate({
      date,
    });

    if (freeTimeSlots.length < 1) {
      let staffIds = await userService.fetchIdsOfStaffsWhoCanTakeAppointments();

      const timeSlotDocuments = freeTimeSlotService.getTimeSlotDocuments({
        staffIds,
        date,
        clearOut: true,
      });

      await freeTimeSlotService.addSlotsForStaff({
        timeSlotDocuments,
      });

      return res.send(successMessage("Successfully cleared out date", null));
    }

    const { err, nModified } = await freeTimeSlotService.clearOutAppointment(
      date
    );

    if (err) return jsonResponse(res, 500, false, "Something Failed");

    res.send(successMessage("Successfully cleared out date", null));
  }
  //Delete appointment account entirely from the database
  async deleteFreeTimeSlot(req, res) {
    const appointment = await appointmentService.getFreeTimeSlotById(
      req.params.id
    );
    if (!appointment) return res.status(404).send(errorMessage("appointment"));

    await appointmentService.deleteFreeTimeSlot(req.params.id);

    res.send(successMessage(MESSAGES.DELETED, appointment));
  }
}

module.exports = new FreeTimeSlotController();
