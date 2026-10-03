import AiCaptureDialog from "./AiCaptureDialog";

export default function AiExpenseCaptureModal(props) {
  return <AiCaptureDialog {...props} targetDomain={"EXPENSE"}
    title="Capture an expense"
    description="Describe a purchase or attach a receipt. Mira will organize the details."
    placeholder="Paid ₹450 for lunch at a café, including a ₹30 tip."
    label="What did you spend?"
    imageLabel="Add a receipt or bill photo"
    dated={true} />;
}
