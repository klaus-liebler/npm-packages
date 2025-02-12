
export enum eCanMessageType 
{
    // There is no "node application", all node-related messages are in a separate namespace
    // Reason: Node-messages can be send/received from the bootloader and there
    // hence, the node ID has to be burned in the bootloader of a node
    // the bootloader places this information in the RTC_RAM
    NodeEvent = 0x00000000,
    // Messages from an application (which it does not matter, on which node the app is running)
    ApplicationEvent = 0x01000000,
    NodeCommand = 0x02000000,
    NodeCommandAcknowledge = 0x03000000,
    ApplicationCommand = 0x04000000,
    CommandAcknowledge = 0x05000000,
    ApplicationStatus = 0x06000000,
    Payload = 0x1F000000,

};

// as long as not all nodes speak the new CAN IDs, this assures compatibility, if only Commands are used
export enum eCanMessageTypeOld
{
    ApplicationCommand = 0x00000000,
    ApplicationEvent = 0x01000000,
    NodeCommand = 0x02000000,
    NodeCommandAcknowledge = 0x03000000,
    NodeEvent = 0x04000000,
    CommandAcknowledge = 0x05000000,
    ApplicationStatus = 0x06000000,
    ApplicationStatus1 = 0x07000000,		// if 8bytes for status are not enough, this may address the second 8 bytes
    ApplicationStatusSplitted = 0x08000000, // first Byte of Payload is Index ==>Status may have 256*7Bytes =1792bytes
    Payload = 0x1F000000,

};

export enum eNodeCommandType
{
    NOC = 0,
    RESET = 1,
    PAYLOAD = 2,
    COPY_SCRATCH_TO_FLASH = 3,
    WRITE_SCRATCH = 4,
    CNT,
};

export enum eNodeEventType
{
    NOE = 0,
    NODE_STARTED = 1,
    NODE_STATUS = 2,
    NODE_STOPPED = 3,
    NODE_READY = 4,
    BOOTLOADER_READY = 5,
    // APPLICATION_STARTED=5, NO!!! THIS IS APPLICATION STATUS
    // APPLICATION_STATUS=6,
    // APPLICATION_STOPPED=7,
    CNT,
};




