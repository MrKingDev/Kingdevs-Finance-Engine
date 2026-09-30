import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
const ClearData = () => {
  return (
    <>
      <Field>
        <FieldLabel htmlFor="clearData">Type CLEAR to confirm</FieldLabel>
        <Input id="clearData" type="password" />
      </Field>
      <Button variant="destructive" className="mt-4">
        Clear Data
      </Button>
    </>
  );
};

export default ClearData;
