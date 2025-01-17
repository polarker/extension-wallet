import { KeyType } from "@alephium/web3"
import * as yup from "yup"

import { addressSchema } from "./../../ui/services/addresses"
import { AddressBookContact, AddressBookContactNoId } from "./type"

export const addressBookContactNoIdSchema: yup.Schema<AddressBookContactNoId> =
  yup
    .object()
    .required()
    .shape({
      name: yup.string().required("Contact Name is required"),
      networkId: yup.string().required("Contact Network is required"),
      address: addressSchema,
      keyType: yup.mixed<KeyType>().oneOf(['default', 'bip340-schnorr']).required("Contact Key Type is required")
    })

export const addressBookContactSchema: yup.Schema<AddressBookContact> = yup
  .object()
  .required("Contact is required")
  .shape({
    id: yup.string().required(),
    name: yup.string().required("Contact Name is required"),
    networkId: yup.string().required("Contact Network is required"),
    address: addressSchema,
    keyType: yup.mixed<KeyType>().oneOf(['default', 'bip340-schnorr']).required("Contact Key Type is required")
  })
