package decrypt

import (
	"encoding/base64"

	"github.com/pkg/errors"
)

//go:generate mockery --outpkg=decrypt --name=DecryptAES --output=. --filename=aes_mock.go --structname=MockDecryptAES --inpackage
type DecryptAES interface {

	// Decrypt with provided nonce
	DecryptWithNonce(key, nonce, ciphertext string) (string, error)
	DecryptFileWithNonce(key, nonce, inputFilePath, outputFilePath string) error

	// Decrypt with auto-generated nonce (extracted from ciphertext)
	Decrypt(key, nonceCiphertext string) (string, error)
	DecryptFile(key, inputFilePath, outputFilePath string) error
}

type decryptAESImpl struct{}

func NewDecryptAES() DecryptAES {
	return &decryptAESImpl{}
}

func (dcp *decryptAESImpl) DecryptWithNonce(key, nonce, ciphertext string) (string, error) {
	decodedCiphertext, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", errors.Wrap(err, "decode ciphertext error")
	}

	result, err := dcp.decryptAES256GCM([]byte(key), []byte(nonce), decodedCiphertext, false)
	if err != nil {
		return "", errors.Wrap(err, "Decrypt AES256GCM error")
	}

	return string(result), nil
}

func (dcp *decryptAESImpl) DecryptFileWithNonce(key, nonce, inputFilePath, outputFilePath string) error {
	err := dcp.decryptFileAES256GCM([]byte(key), []byte(nonce), inputFilePath, outputFilePath, false)
	if err != nil {
		return errors.Wrap(err, "Decrypt file error")
	}

	return nil
}

func (dcp *decryptAESImpl) Decrypt(key, nonceCiphertext string) (string, error) {
	decodedCiphertext, err := base64.StdEncoding.DecodeString(nonceCiphertext)
	if err != nil {
		return "", errors.Wrap(err, "decode ciphertext error")
	}

	result, err := dcp.decryptAES256GCM([]byte(key), nil, decodedCiphertext, true)
	if err != nil {
		return "", errors.Wrap(err, "Decrypt AES256GCM with nonce error")
	}

	return string(result), nil
}

func (dcp *decryptAESImpl) DecryptFile(key, inputFilePath, outputFilePath string) error {
	err := dcp.decryptFileAES256GCM([]byte(key), nil, inputFilePath, outputFilePath, true)
	if err != nil {
		return errors.Wrap(err, "Decrypt file with nonce error")
	}

	return nil
}
